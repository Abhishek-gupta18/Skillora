# Constraints.md — Things That Must NEVER Be Changed Without Explicit Review

This is a hard list. If a task seems to require violating one of these,
STOP and flag it for review instead of proceeding — do not silently
work around it, and do not assume the task description implicitly
authorizes it.

---

## 1. Ownership / IDOR Rules

- **NEVER** accept `profileId`, `userId`, or any other ownership-
  determining field from `req.body` or `req.params` in any
  candidate-facing endpoint. The only valid source is
  `req.profile.id` (set by `attachProfile`, derived from the
  authenticated JWT's `req.user.id`).
- **NEVER** write an `update`/`delete` for a one-to-many section
  (Education, Experience, SkillClaim, Certification, Project,
  PreferredRole, PreferredLocation, LanguageKnown, SocialLink,
  Reference) that looks up a row by its `id` alone. It MUST be
  `findFirst({ where: { id, profileId: req.profile.id } })` —
  BOTH conditions in the SAME query — before any mutation.
- **NEVER** distinguish "this id doesn't exist" from "this id belongs
  to someone else" in an error response. Both must produce the same
  generic 404.
- If adding a NEW one-to-many section in the future, it MUST follow
  this exact same ownership-check pattern as the existing 10 — no
  exceptions, no shortcuts, even under time pressure.

---

## 2. Authentication / Secrets

- **NEVER** change the login/register error messages to reveal
  whether a specific email exists in the system. Both "no such user"
  and "wrong password" must remain the same status code (401) and
  the same message ("Invalid email or password").
- **NEVER** remove or weaken the `DUMMY_HASH` timing-attack mitigation
  in `login()`. If `DUMMY_HASH` is ever regenerated, it MUST be a
  real, syntactically valid bcrypt hash (correct `$2b$12$` prefix,
  53 characters after it) — never a placeholder string.
- **NEVER** lower bcrypt below 12 salt rounds.
- **NEVER** allow a password longer than 72 characters to be silently
  truncated — it must be explicitly rejected at validation.
- **NEVER** log a raw password, raw phone number, raw reference
  contact info, the JWT secret, or the encryption key, anywhere,
  under any log level, even in an error message.
- **NEVER** return `passwordHash`, or any AES-encrypted field's raw
  ciphertext, in any API response. Encrypted fields must always be
  decrypted before being sent back to their owner, or omitted
  entirely.
- **NEVER** hardcode a fallback/default value for `JWT_SECRET` or
  `ENCRYPTION_KEY`. If the env var is missing, the server must refuse
  to start (this is already enforced in `config/env.js` and
  `utils/encryption.js` — do not add a `|| 'some-default'` anywhere
  near these).
- **NEVER** verify a JWT without pinning `{ algorithms: ['HS256'] }`
  explicitly — this defends against algorithm-confusion attacks.

---

## 3. Encryption

- **NEVER** change the AES mode away from GCM (which provides
  authenticated encryption / tamper detection) to a mode without
  built-in integrity checking (e.g. CBC) without a full security
  review — this isn't a drop-in swap.
- **NEVER** reuse an IV across `encrypt()` calls. Each call must
  generate a fresh `crypto.randomBytes(12)`.
- **NEVER** let `decrypt()` swallow an auth-tag verification failure
  and return partial/garbage plaintext. A tampered or corrupted
  payload must throw, not decrypt "successfully" into nonsense.
- **NEVER** add a new "encrypted" field without also adding it to the
  decrypt-before-response logic wherever that section is read (see
  `getFullProfile`, `listReferences`, `upsertBasicInfo`, etc. for the
  existing pattern of try/catch-and-null-on-failure so one bad record
  doesn't crash an entire list response).

---

## 4. File Upload (Resume)

- **NEVER** trust `req.file.mimetype` or `req.file.originalname`
  alone as the security gate for file type. The magic-byte check
  (`isValidPdf`) in the controller is the real gate — `fileFilter` in
  `uploadMiddleware.js` is only a cheap first pass and is known to be
  spoofable.
- **NEVER** use `req.file.originalname` (or any other client-supplied
  string) as part of a disk file path. Storage filenames must always
  be server-generated (random + unpredictable).
- **NEVER** write the new resume file to disk AFTER deleting the old
  one. The order must remain: write new → record in DB → delete old
  — so a failure partway through never leaves a candidate with zero
  resumes.
- **NEVER** return the internal server-side storage path or filename
  in any API response.
- **NEVER** raise the file size limit or accept additional file
  types (e.g. `.doc`/`.docx`) without deliberately updating both the
  multer config AND the magic-byte validator to match — these two
  must never drift out of sync.

---

## 5. Rate Limiting / Input Validation

- **NEVER** remove `authLimiter` from the register/login routes. Auth
  endpoints are brute-force targets and must stay tightly rate-
  limited (10 requests / 15 min per IP), independent of the more
  permissive `globalLimiter` (300 / 15 min) applied everywhere else.
- **NEVER** skip `handleValidationErrors` in a new route that accepts
  user input. Every POST/PATCH endpoint must run its validator chain
  before reaching a controller.
- **NEVER** add cross-field business-rule validation (e.g. "min <=
  max", "endDate required unless isCurrent") to an UPDATE (PATCH)
  validator — that check belongs in the controller, after merging
  with the existing DB row (see Decisions.md for why).

---

## 6. Database / Migrations

- **NEVER** run `prisma migrate` (or any schema-changing command)
  against the Supabase Transaction Pooler connection string (port
  6543). Only the Session Pooler (5432) connection is safe for
  migrations.
- **NEVER** put the datasource `url` back inside `schema.prisma`'s
  `datasource db` block — on Prisma 7+, it belongs in
  `prisma.config.ts` only.
- **NEVER** commit `.env` to git. It is already in `.gitignore` —
  do not remove that line, and do not add a workaround that
  reintroduces secrets into a tracked file.
- **NEVER** hand-edit a generated migration file to "fix" something
  after the fact — if a migration is wrong, create a new migration
  that corrects it.

---

## 7. Assessment Engine (once built — see Decisions.md for current status)

- **NEVER** include `Question.correctOptionIndex` in any API response
  sent to a candidate before or during an active assessment session.
- **NEVER** include a hidden `TestCase.expectedOutput` (`isHidden:
  true`) in any response visible to the candidate — only
  non-hidden/sample test cases may ever be shown.
- **NEVER** hardcode a Judge0 language ID. It must be resolved from
  Judge0's own `/languages` endpoint, since these IDs are version-
  specific and can change.
- **NEVER** put the Judge0 API key anywhere reachable by the
  frontend — it is a server-side secret only.
- **NEVER** allow more than one `IN_PROGRESS` `AssessmentSession` for
  the same `(profileId, skillId)` pair at the same time.

---

## 8. General

- **NEVER** make a change described in this file "just for now" or
  "temporarily" — if a listed constraint genuinely needs to change,
  it needs a real decision (logged in `Decisions.md`) and explicit
  review, not a quiet exception.
- If unsure whether something falls under one of the rules above,
  treat it as if it does, and ask before proceeding.
