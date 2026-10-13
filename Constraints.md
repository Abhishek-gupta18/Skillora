# Constraints.md — Things That Must NEVER Be Changed Without Explicit Review

This is a hard list, for humans and AI coding assistants alike. If a task
seems to require violating one of these rules, STOP and flag it for review
instead of proceeding. Do not silently work around it, and do not assume the
task description implicitly authorizes it.

This file replaces BOTH the old root `Constraints.md` and
`docs/constraint.md` (their content is merged here). Delete the duplicate so
there is one source of truth.

---

## 1. Ownership / IDOR Rules

- **NEVER** accept `profileId`, `userId`, or any other ownership-determining
  field from `req.body` or `req.params` in a candidate-facing endpoint. The
  only valid source is `req.profile.id` (set by `attachProfile`, derived from
  the authenticated JWT's `req.user.id`).
- **NEVER** write an `update`/`delete` for a candidate-owned resource that
  looks the row up by its `id` alone. Use
  `findFirst({ where: { id, profileId: req.profile.id } })` — BOTH conditions
  in the SAME query — before any mutation. This applies to the 10 list
  sections of the profile and equally to `Application`, `RoadmapAssignment`,
  `AssessmentSession`, `CodingSubmission` (via its session's `profileId`) and
  `InterviewExperience` (`authorProfileId`).
- **NEVER** distinguish "this id doesn't exist" from "this id belongs to
  someone else". Both must return the same generic 404.
- Any NEW candidate-owned resource MUST follow this pattern. No exceptions,
  even under time pressure.

---

## 2. Authentication / Authorization

- **NEVER** change login/register errors so they reveal whether an email
  exists. Login failures are always 401 "Invalid email or password";
  duplicate registration is always 409 "Registration failed".
- **NEVER** remove or weaken the `DUMMY_HASH` timing-attack mitigation in
  `login()`. If it is ever regenerated it MUST be a real, valid bcrypt hash
  (`$2b$12$` + 53 characters), never a placeholder string.
- **NEVER** lower bcrypt below 12 salt rounds, and never let a password over
  72 characters be silently truncated (reject it at validation).
- **NEVER** let `register` create anything but `role: CANDIDATE`, and never
  read a `role` from the request body. Admins are created only through the
  `seedAdmin` bootstrap script. No endpoint may promote a user.
- **NEVER** base an authorization decision on a value inside the JWT payload
  (e.g. its `type` field). `requireRole` re-reads the user's current role
  from the database; keep it that way.
- **NEVER** verify a JWT without pinning `{ algorithms: ['HS256'] }`.
- **NEVER** log a raw password, raw phone number, raw reference contact info,
  the JWT secret, or the encryption key, at any log level.
- **NEVER** return `passwordHash` or the raw ciphertext of an encrypted field
  in any API response. Encrypted fields are decrypted for their owner or
  omitted.

---

## 3. Encryption

- **NEVER** change the AES mode away from GCM, and never reuse an IV
  (`crypto.randomBytes(12)` on every `encrypt()` call).
- **NEVER** let `decrypt()` swallow an auth-tag failure or return partial
  plaintext. A tampered payload must throw. (Callers that list many rows
  catch per field and return `null` for that field only.)
- **NEVER** add a new encrypted field without adding its decrypt-before-
  response handling wherever that data is read.
- **NEVER** rotate `ENCRYPTION_KEY` once real users exist without a
  re-encryption migration: every existing ciphertext becomes permanently
  unreadable. Back the key up separately from the database.

---

## 4. File Upload (Resume)

- **NEVER** treat `mimetype` or `originalname` as the security gate. The
  magic-byte check (`isValidPdf`) in the controller is the real gate;
  `fileFilter` is only a cheap first pass.
- **NEVER** use a client-supplied filename in any disk path. Storage names
  are always server-generated and unpredictable.
- **NEVER** change the upload order: write the new file → upsert the DB row →
  delete the old file.
- **NEVER** return the internal storage path or filename in a response.
- **NEVER** raise the size limit or accept another file type without
  updating both the multer config and the magic-byte validator together.
- **NEVER** duplicate the resume read/integrity-check/stream logic. Candidate
  and admin downloads both go through `streamResumeToResponse`.

---

## 5. Rate Limiting / Input Validation

- **NEVER** remove `authLimiter` from register/login (10 requests / 15 min
  per IP), independent of the global limiter.
- **NEVER** skip `handleValidationErrors` on a route that accepts input.
- **NEVER** put cross-field business rules (min ≤ max, `endDate` vs
  `isCurrent`) in a PATCH validator. A validator can't see the stored row;
  merge with the existing row in the controller and validate the result.
- **NEVER** pass `req.body` straight into a Prisma `data` object. Build an
  explicit field-by-field whitelist. These are never client-writable:
  `role`, job `status` outside its dedicated endpoint, `postedAt`,
  `completedAt`, `verifiedScore`, `consentTimestamp`, and any ownership id.

### 5.5 Express 5 + express-validator query parameters

- **NEVER** read a sanitized query value directly from `req.query` in a
  controller. In Express 5, `req.query` is a read-only getter that re-parses
  the URL on every access, so express-validator sanitizers (`.toBoolean()`,
  `.trim()`, ...) on `query()` chains silently do nothing and `req.query`
  still holds the raw string.
- **ALWAYS** read validated query parameters with `matchedData(req)` from
  `express-validator`.
- This does NOT affect `req.body` or `req.params`, which stay normal mutable
  objects. It is a project-wide rule for every endpoint that validates query
  parameters with a sanitizer.

### 5.6 Interview Experience

- `authorProfileId` is NEVER accepted from the client; it is always
  `req.profile.id`, and the create route requires `attachProfile`.
- List and single-item GET responses NEVER include author-identifying data
  (name, email, profile link, profile relation, `authorProfileId`),
  unconditionally, not only when `isAnonymous` is true. Use a Prisma `select`
  whitelist, never post-query stripping.
- Delete-own uses the combined `{ id, authorProfileId }` query with an
  identical 404 for missing and not-yours.
- `companyId` / `jobPostingId` relations use `onDelete: SetNull` so a post
  survives deletion of the linked Company/JobPosting.
- Query filtering uses `matchedData(req)` (see 5.5).
- No upvote system and no moderation beyond admin manual delete in this
  version.

---

## 6. Database / Migrations

- **NEVER** run `prisma migrate` against the Supabase Transaction Pooler
  (port 6543). Use the Session Pooler (5432).
- **NEVER** put the datasource `url` back inside `schema.prisma`; on
  Prisma 7 it lives in `prisma.config.ts` only.
- **NEVER** commit `.env`.
- **NEVER** hand-edit a generated migration. If a migration is wrong, create
  a new migration that corrects it.
- **NEVER** change an `onDelete` rule without review. Current policy:
  - `Cascade` only for owned sub-components: Profile → its profile
    sections, applications, interview experiences, assessment sessions and
    roadmap assignments; CodingQuestion → TestCase; RoadmapTemplate →
    RoadmapStep; RoadmapAssignment → RoadmapStepProgress; InterviewExperience
    → InterviewRound; AssessmentSession → its answers and submissions.
  - `Restrict` for anything that protects history or integrity:
    User → Profile, Application → JobPosting, JobRequiredSkill → JobPosting,
    AssessmentAnswer → Question, CodingSubmission → CodingQuestion,
    RoadmapAssignment → RoadmapTemplate, RoadmapStepProgress → RoadmapStep.
    Deleting such a parent must surface as a clean 409 (P2003), not a 500.
  - `SetNull` only for InterviewExperience → Company/JobPosting.

---

## 7. Assessment Engine (MCQ live; coding / Judge0 paused)

- **NEVER** include `Question.correctOptionIndex` in any response, and never
  reveal `isCorrect` before the session is completed (`submitAnswer` returns
  only `{ questionId, submitted: true }`).
- **NEVER** include a hidden `TestCase.expectedOutput`, or the hidden test
  cases themselves, in any candidate-visible response.
- **NEVER** hardcode a Judge0 language id (resolve it from Judge0's
  `/languages`), and never expose the Judge0 API key outside the server.
- **NEVER** take `targetLevel` from the client. It comes from the
  candidate's `SkillClaim.selfRatedLevel`. Pass thresholds and difficulty
  bands come only from `utils/skillLevelBands.js`.
- **NEVER** write `SkillClaim.verifiedScore` except when `passed === true`,
  and never reset it on a failed retake.
- Every session endpoint checks expiry and self-heals to `EXPIRED`,
  including `completeSession`. The try/catch around the `verifiedScore`
  write in `completeSession` is the one deliberate silent catch in that
  file; do not copy that pattern elsewhere.
- Only one `IN_PROGRESS` session per `(profileId, skillId)` is intended; it
  is enforced in application logic only (known race, see Decision.md).

---

## 8. Roadmap and Dashboard

- **NEVER** choose a roadmap template from the candidate's current
  `selfRatedLevel`. Use the `targetLevel` snapshot of their latest COMPLETED
  session for that skill, and only if that session has `passed === false`.
- **NEVER** compute progress percent from the number of progress rows. Always
  use `calculateRoadmapProgress(templateStepCount, completedCount)` with the
  template's CURRENT step count, so steps added later count as incomplete.
- **NEVER** coerce `isCompleted`. It must be a real boolean (`typeof` check).
- **NEVER** accept a client-supplied `completedAt`, and never move an
  existing `completedAt` by re-saving. Set it only on the transition to
  completed.
- **NEVER** return the raw profile object or any encrypted field from
  `/me/dashboard`, and never copy the eligibility algorithm; reuse
  `services/eligibilityService.js`.

---

## 9. TLS / Certificate Handling

- **NEVER** disable TLS verification, in code, `.env`, scripts or npm
  scripts: no `NODE_TLS_REJECT_UNAUTHORIZED`, no `rejectUnauthorized: false`.
- **NEVER** put `sslmode=` in `DATABASE_URL`. `pg` lets a connection-string
  `sslmode` override the adapter's `ssl.ca`, which silently breaks the CA
  setup.
- `certs/supabase-ca.crt` must exist at startup; `config/prisma.js` throws if
  it is missing. Get it from Supabase Dashboard → Project Settings →
  Database → SSL Configuration.
- The Supabase CA is a public certificate, so `certs/` is deliberately NOT in
  `.gitignore`. Never place a private key or any secret there.
- When Supabase rotates its CA, keep the old file as a backup, drop in the
  new one, verify with a real request that hits the database (a login with a
  wrong password should return 401), and only then delete the backup.

---

## 10. Secrets Management

- **NEVER** hardcode or default `JWT_SECRET`, `ENCRYPTION_KEY`,
  `DATABASE_URL`, `RAPIDAPI_KEY` or any other secret. The server must refuse
  to start if one is missing (`config/env.js`, `utils/encryption.js`).
- **NEVER** log or print a secret at any level, including error messages and
  stack traces, and never put one in an API response.
- **NEVER** read, `cat` or print `.env`, and never put a connection string,
  password or token in a script or terminal command. Reference
  `process.env` instead.
- If a secret ever appears in terminal output, a chat, a log or a file, treat
  it as compromised and rotate it immediately.
- Use different secrets per environment. Rotating `JWT_SECRET` logs everyone
  out; rotating `ENCRYPTION_KEY` has the consequence described in section 3.
- `.env` is the only secret file guaranteed to be in `.gitignore`. Check with
  `git check-ignore` before adding any other file that holds a secret.

---

## 11. Dependencies and Tooling

- `prisma`, `@prisma/client` and `@prisma/adapter-pg` must all be pinned to
  the SAME exact version (currently `7.10.0`): no `^`, no `~`, no RC, dev or
  canary builds. The `prisma` CLI belongs in `devDependencies`.
- **NEVER** run `npm update`, `npm install <prisma package>@latest` or
  `npm audit fix --force`. Plain `npm audit fix` is allowed; re-check the
  Prisma pins afterwards.
- **NEVER** leave temporary or debug scripts in the repo root (`test-*.js`,
  `make-admin.js`, ...). Delete them in the same session, and never embed
  credentials in one.
- **NEVER** edit files outside the task's scope (`server.js`, `config/*`,
  `.env`, `package.json`) unless the task says so. Report the need instead.
- AI assistants: when asked to show a file or a command's output, paste the
  raw text. "Already implemented" and summaries do not count as proof.
- Commands must run in Windows PowerShell (no `timeout`, `grep`,
  `/dev/null` or `|| true`).

---

## 12. General

- **NEVER** make a change described in this file "just for now" or
  "temporarily". If a constraint genuinely has to change, it needs a real
  decision (logged in `Decision.md`) and explicit review, not a quiet
  exception.
- If you are unsure whether something falls under one of these rules, treat
  it as if it does and ask before proceeding.
