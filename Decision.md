# Decisions.md — Skillora Backend

This file logs every non-obvious design decision made in this codebase
and WHY it was made. Before changing any of the things listed below,
read the reasoning first — if the reasoning still holds, the existing
decision should probably stay. If you believe the reasoning no longer
applies, say so explicitly and get it reviewed before changing it.

---

## Database: PostgreSQL (not MongoDB)

**Decision:** Use PostgreSQL + Prisma, not MongoDB.

**Why:** Skillora's data is inherently relational — a Profile has 18
linked sections, SkillClaims reference a master Skill table, bookings/
assessments will reference Profile + Skill + Job. We need real foreign
keys, cascade rules, unique constraints across combinations
(`[profileId, skillId]`, `[profileId, platform]`, etc.), and
transactional writes (registration creates User + Profile + BasicInfo +
PrivacyConsent atomically). MongoDB does not give native relations or
multi-document ACID transactions as cleanly as Postgres. Since the
matching/eligibility engine (planned) will do relational queries
(skills × jobs × ratings), Postgres was the right call.

---

## 18 Profile Sections as Separate Tables (not one giant Profile row)

**Decision:** Each of the 18 sections (BasicInfo, Address, Education,
etc.) is its own Prisma model, linked to `Profile` by `profileId`, not
flattened into one wide table.

**Why:** Independent validation per section, independent
create/update timing (some sections exist from registration, others
are created later), and cleaner cascade-delete behavior. It also
lets each section have its own uniqueness rules
(e.g. `@@unique([profileId, platform])` on SocialLink) without
affecting unrelated sections.

---

## `User → Profile` is `onDelete: Restrict`, not `Cascade`

**Decision:** Deleting a `User` does NOT automatically cascade-delete
their `Profile`. All 18 section tables DO cascade-delete when a
`Profile` is deleted.

**Why:** Account deactivation should be a deliberate, explicit flow
(not a side effect of some other operation), to avoid accidental data
loss. Once a Profile is intentionally deleted, its child sections
should clean up automatically — no orphaned rows.

---

## `PrivacyConsent` auto-created at registration, with `consentTimestamp` nullable

**Decision:** Every new Profile gets a `PrivacyConsent` row
immediately (defaults: `visibility=PRIVATE`, `dataSharingConsent=false`,
`consentTimestamp=null`), created inside the same transaction as
registration.

**Why:** Simpler downstream code — every profile is guaranteed to have
a PrivacyConsent row, so no null-checking is needed anywhere that reads
it. `consentTimestamp` is nullable because there's no real "consent
moment" at registration time — it's only set later, server-side, the
first time the candidate actively changes `dataSharingConsent`
(see next entry).

---

## `consentTimestamp` is NEVER accepted from the client

**Decision:** `upsertPrivacyConsent` ignores any `consentTimestamp` in
the request body. The server sets it to `new Date()` itself, and ONLY
when `dataSharingConsent` is present in that same request.

**Why:** This timestamp is a compliance/audit record of when the user
actually consented. If a client could set an arbitrary timestamp, a
user (or attacker) could backdate or fabricate consent history. This
must always reflect a real server-observed event.

---

## Encryption: AES-256-GCM at rest, NOT true end-to-end encryption

**Decision:** `BasicInfo.phone` and `Reference.contactInfo` are
encrypted with AES-256-GCM in the application layer before being
written to Postgres, and decrypted after reading, using
`utils/encryption.js`. This is NOT end-to-end encryption.

**Why:** True E2E encryption (where even the server can never read the
data) is incompatible with this product — the server must be able to
decrypt these fields to display them back to the profile owner, and
future recruiter-facing views will need to read them too (under
privacy-setting control). What we actually need — and have — is
encryption-at-rest for two specific PII fields, so a raw database
breach doesn't expose them in plaintext. Passwords are separately
hashed with bcrypt (one-way, never AES — a password is never
"decrypted").

**Format:** `"v1:<iv_base64>:<authTag_base64>:<ciphertext_base64>"` —
the `v1:` prefix exists so a future key-rotation or algorithm change
doesn't break old records; `decrypt()` will reject payloads with an
unrecognized version prefix instead of guessing.

**Operational risk:** If `ENCRYPTION_KEY` is ever lost (not backed up
somewhere separate from the database), every encrypted field becomes
PERMANENTLY unreadable. There is no recovery mechanism by design. This
key must be backed up securely and separately from the database.

---

## `ENCRYPTION_KEY` / `JWT_SECRET` validated at startup, not lazily

**Decision:** `config/env.js` (`validateEnv()`) and
`utils/encryption.js` both throw immediately at module-load time if
required env vars are missing or malformed (e.g. `ENCRYPTION_KEY` not
exactly 32 bytes, `JWT_SECRET` shorter than 32 chars). The server
refuses to start rather than starting in a broken/insecure state.

**Why:** Fail fast. A missing or weak secret should never be
discovered for the first time when a real request hits a broken
code path in production.

---

## bcrypt: 12 salt rounds, 72-char password max enforced explicitly

**Decision:** Password hashing uses bcrypt at 12 rounds.
`registerValidation` rejects passwords over 72 characters with a
clear message, rather than silently truncating them.

**Why:** bcrypt silently ignores any bytes beyond 72 — two different
long passwords sharing the same first 72 characters would hash
identically, which is surprising and could weaken security if left
undocumented/unhandled. Rejecting upfront avoids that silent footgun.

---

## Timing-attack mitigation on login (`DUMMY_HASH`)

**Decision:** When `login()` doesn't find a matching user, it still
calls `comparePassword()` against a hardcoded, syntactically valid
(but fake) bcrypt hash (`DUMMY_HASH`) before responding 401 — so a
"no such user" response takes roughly the same time as a "wrong
password" response, and both return the identical generic message
`"Invalid email or password"`.

**Why:** Without this, an attacker could distinguish "user doesn't
exist" from "user exists, wrong password" purely by response timing
or wording, and enumerate valid emails in the system. `DUMMY_HASH`
MUST remain a real, valid bcrypt hash string (correct `$2b$12$` prefix,
53 chars after it) — an invalid/malformed hash risks
`bcrypt.compare()` throwing instead of returning `false`, which would
leak the distinction via a 500 vs 401 status code difference.

---

## Registration is one atomic transaction; P2002 race condition handled explicitly

**Decision:** `register()` creates `User` → `Profile` → `BasicInfo` →
`PrivacyConsent` inside a single `prisma.$transaction`. A `P2002`
(unique constraint violation on email) thrown from *inside* the
transaction is caught and converted to the same generic 409
`"Registration failed"` response as the pre-check.

**Why:** All four rows must exist together or not at all — no partial
user records. The extra P2002 catch handles the race condition where
two simultaneous registrations with the same email both pass the
initial `findUnique` check before either commits; the database's
`@unique` constraint is the real guardrail, and its failure must still
surface as a clean, non-enumerating error.

---

## Every candidate-facing profile mutation is scoped via `req.profile.id`, never client input

**Decision:** No controller anywhere accepts `profileId` (or
`userId`) from `req.body` or `req.params`. `attachProfile` middleware
resolves `req.profile.id` from the authenticated JWT
(`req.user.id` → `Profile.userId`), and every query filters by that
value.

**Why:** This is the core IDOR (Insecure Direct Object Reference)
defense for the whole profile system. If a client could supply their
own `profileId`, they could read or modify another candidate's data.

---

## List-section update/delete ALWAYS verify ownership via combined `findFirst({ id, profileId })`

**Decision:** For the 10 one-to-many sections (Education, Experience,
SkillClaim, Certification, Project, PreferredRole, PreferredLocation,
LanguageKnown, SocialLink, Reference), every `update`/`delete`
function first runs `findFirst({ where: { id, profileId: req.profile.id } })`
and returns a generic 404 if nothing matches — NEVER a plain
`findUnique({ id })` followed directly by an update/delete.

**Why:** These rows have their own `id`, separate from `profileId`.
Without the combined ownership check, a candidate could edit or delete
another candidate's education/experience/etc. by guessing or brute-
forcing another row's id. 404 (not 403) is used deliberately so the
response doesn't confirm whether the id exists at all — it looks
identical whether the row doesn't exist or belongs to someone else.

---

## `SkillClaim.verifiedScore` is never client-writable

**Decision:** No create/update validator or controller for
`SkillClaim` ever reads or applies a `verifiedScore` field from the
request body, even if the client echoes back a full object it
received from a GET request.

**Why:** `verifiedScore` will only ever be set by the future Assessment
Engine after a candidate completes a real assessment. Letting a
candidate self-report this value would defeat the entire purpose of
skill *verification*.

---

## Partial-update ("PATCH") cross-field validation lives in the CONTROLLER, not the validator

**Decision:** For fields with cross-field consistency rules —
`SalaryExpectation.minAmount <= maxAmount`, and
`ExperienceEntry.isCurrent` / `endDate` / `startDate` consistency — the
CREATE validators check this normally (all fields are present on
create). The UPDATE validators do NOT attempt this check. Instead,
the corresponding controller fetches the existing DB row, MERGES it
with whatever fields the request actually included, and validates the
merged result before writing.

**Why:** A PATCH request may only touch one of several
interdependent fields (e.g. `{ maxAmount: 30000 }` alone). A validator
has no way to see the existing DB value, so any cross-field check at
the validator layer would incorrectly reject legitimate partial
updates (or fail to catch a resulting inconsistent state). Merging
against the current DB row in the controller is the only place this
can be checked correctly.

---

## Section create-vs-update: existence check before upsert (for sections not created at registration)

**Decision:** For the 5 singular sections NOT created during
registration (Address, ProfilePhotoHeadline, CareerSummary,
SalaryExpectation, AvailabilitySetting), each `upsert<Section>`
controller first checks whether a row already exists for this
profile. If it does NOT exist yet, all schema-required fields for
that section must be present in the request, or the API returns a
clean 422 listing exactly which fields are missing — instead of
letting Prisma attempt a `create` with missing required columns and
throw an unhandled error.

**Why:** These 5 sections use `upsert` so the same endpoint handles
both "first time filling this in" and "editing it later" — but Prisma
doesn't know the difference between a legitimate partial *update* and
an invalid partial *create*. The controller has to make that
distinction explicit.

---

## Resume storage: local disk, magic-byte validation, safe random filenames, write-then-record-then-delete-old

Several decisions bundled together here:

1. **Local disk (not S3) for now** — simplest for the current scale;
   swappable later behind the same controller interface.
2. **Storage directory is OUTSIDE any statically-served path**
   (`RESUME_STORAGE_DIR`, not under `public/`) — files are only
   reachable through the authenticated `downloadResume` route, never
   by a guessable direct URL.
3. **`multer.memoryStorage()`**, not `diskStorage` — the file arrives
   as a Buffer so it can be validated/hashed BEFORE anything touches
   disk.
4. **Magic-byte check (`isValidPdf`) is the real gate, not
   `mimetype`/extension.** `fileFilter` in `uploadMiddleware.js` is
   only a cheap first-pass filter (both are trivially spoofable by an
   attacker); `isValidPdf()` in the controller checks the actual first
   5 bytes (`%PDF-`) of the buffer — this can't be faked by renaming a
   file or setting a header.
5. **Filenames for disk storage are always server-generated**
   (`${timestamp}-${randomBytes}.pdf`) — `req.file.originalname` is
   NEVER used in any file path, to prevent path traversal / overwrite
   attacks.
6. **Upload order: write NEW file → upsert DB record → delete OLD
   file.** If the disk write fails, the DB is untouched and the
   candidate's previous resume is intact. If the DB write fails after
   a successful disk write, the new file is orphaned on disk (a minor
   cleanup issue) but the candidate never ends up with *no* resume at
   all. The old file is only removed once both prior steps succeeded.
7. **The internal storage path/filename is never returned in any API
   response** — the client gets `{ id, uploadedAt, fileHash }` only.
   Download always sets `Content-Disposition: attachment;
   filename="resume.pdf"` (a fixed, generic name), never the internal
   filename.

---

## `prisma` CLI is a devDependency; `@prisma/client` is a runtime dependency

**Decision:** `package.json` lists `prisma` under `devDependencies`
and `@prisma/client` under `dependencies`.

**Why:** `prisma` (the CLI) pulls in extra tooling (including,
at the time of writing, some transitive dependencies with known
vulnerabilities related to MySQL-introspection support this project
doesn't use). Since it's a devDependency, a production install
(`npm ci --omit=dev` / `npm install --production`) never installs it
at all — only the actual runtime client ships to production.

---

## Prisma version pinned to a real stable release, not whatever resolves first

**Decision:** `prisma` and `@prisma/client` are pinned with
`--save-exact` to `7.10.0` specifically (not a caret range, not
`latest`).

**Why:** An earlier `npm install prisma` resolved to `8.0.0-rc.13` — a
release candidate, not a stable release — purely because of how npm's
dependency resolution picked versions at that moment. For a project
that prioritizes correctness/security over speed, running on an RC
is not acceptable; `7.10.0` was confirmed as the actual latest stable
release at the time.

---

## Prisma 7 config: connection URL lives in `prisma.config.ts`, not `schema.prisma`

**Decision:** `schema.prisma`'s `datasource db` block only declares
`provider = "postgresql"` — no `url` line. The actual connection
string is read from `DATABASE_URL` via `env()` inside
`prisma.config.ts` at the project root.

**Why:** This is a Prisma 7 breaking change — CLI commands like
`prisma migrate dev` now require the datasource URL to be resolvable
via the Prisma Config file, not the old `url = env("DATABASE_URL")`
line inside the schema (that form still works for
`@prisma/client`'s own runtime connection, but not for the CLI).
Omitting `prisma.config.ts` causes `prisma migrate dev` to fail with
"the datasource.url property is required in your Prisma config file."

---

## Supabase connection: Session Pooler (port 5432), never Transaction Pooler (6543), for migrations

**Decision:** `DATABASE_URL` uses Supabase's **Session Pooler**
connection string (port 5432), not the Transaction Pooler (port
6543).

**Why:** Prisma Migrate issues commands that hang indefinitely (no
error, just freezes) against a Transaction-mode pooler connection,
because that mode doesn't support the session-level behavior
migrations rely on. Session Pooler behaves like a normal persistent
connection and works correctly for both runtime queries and
migrations for a standard long-running Express server (as opposed to
a serverless/edge deployment, which is the actual use case Transaction
Pooler is designed for).

---

## Assessment Engine (MCQ + coding via Judge0) — scoped but deferred

**Decision:** The product will eventually support MCQ questions and
coding questions (graded via the Judge0 API) per skill, feeding into
`SkillClaim.verifiedScore`. The schema design for this
(`Question`, `CodingQuestion`, `TestCase`, `AssessmentSession`,
`AssessmentAnswer`, `CodingSubmission`) was planned but NOT yet
implemented — deliberately deferred until core candidate-side
features (profile, resume) were fully built and tested.

**Why (for the eventual implementation, noted now so it isn't
forgotten):**
- Question bank content will be AI-generated once (batch), reviewed
  for quality, then stored — not generated live per-request.
- Coding execution will use a third-party sandboxed service (Judge0
  via RapidAPI), NOT a self-built code-execution sandbox — arbitrary
  code execution is a severe security risk to build in-house.
- `Question.correctOptionIndex` and hidden `TestCase.expectedOutput`
  must never be included in any response sent to a candidate before
  or during an active assessment session.
- Judge0 language IDs must be fetched live from Judge0's own
  `/languages` endpoint at integration time, never hardcoded — these
  IDs are version-specific and change over time.
