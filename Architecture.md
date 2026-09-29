# Architecture.md — Skillora Backend System Map

A map of what exists, what it's for, and how the pieces connect.
Read this before touching a file you haven't worked with before —
know what depends on it first.

---

## Layered Architecture

```
Route  →  Middleware  →  Validator  →  Controller  →  (Service)  →  Model (Prisma)
```

| Layer | Job | Must NOT do |
|---|---|---|
| **Route** (`routes/`) | Map a URL + HTTP method to a middleware chain | Contain business logic |
| **Middleware** (`middleware/`) | Gate the request before it reaches a controller (auth, ownership, rate-limit, upload parsing, validation-result handling) | Query the database for anything beyond what's needed to gate the request (e.g. `attachProfile` only selects the Profile's own id/timestamps, not its full nested data) |
| **Validator** (`validators/`) | Check the SHAPE of `req.body`/`req.params` is well-formed | Check cross-record consistency that requires reading the current DB state (that belongs in the controller — see Decisions.md) |
| **Controller** (`controllers/`) | Read validated input, call Prisma, shape the response | Trust `req.body` for anything security-sensitive (ownership fields) without going through `req.user`/`req.profile` first |
| **Service** (`services/` + pure helpers in `utils/`) | Pure logic with no knowledge of Express (`calculateEligibility`, `encrypt`/`decrypt`, `hashPassword`/`comparePassword`, `hashFileBuffer`, `isValidPdf`) | Import `req`/`res`, or call Prisma directly |
| **Model** (`prisma/schema.prisma`) | Define data shape + DB-level constraints | — |

---

## Folder Structure

```
skillora-backend/
├── server.js                    Entry point — see flow.md for exact startup sequence
├── prisma.config.ts             Prisma 7 CLI config (DATABASE_URL for migrate/generate)
├── .env / .env.example          Secrets — .env is gitignored, never commit it
├── .gitignore
├── package.json
│
├── prisma/
│   ├── schema.prisma            All models, enums, relations
│   ├── seed.js                  Populates the Skill master-data table (idempotent, safe to re-run)
│   └── seedAdmin.js             Seeds an admin user (run manually: npm run seed:admin)
│
├── config/
│   ├── env.js                   validateEnv() — startup sanity check
│   └── prisma.js                Shared PrismaClient singleton — ALWAYS import { prisma } from here, never `new PrismaClient()` elsewhere
│
├── utils/                       Pure functions, no Express/Prisma imports
│   ├── encryption.js            encrypt()/decrypt() — AES-256-GCM for PII fields
│   ├── password.js              hashPassword()/comparePassword() — bcrypt
│   ├── fileIntegrity.js         hashFileBuffer() — SHA-256, for Resume.fileHash
│   └── fileValidation.js        isValidPdf() — magic-byte check for uploaded resumes
│
├── services/                    Pure business logic, no Express I/O (plain objects in, plain objects out)
│   └── eligibilityService.js    calculateEligibility() — matches SkillClaims vs JobRequiredSkills (selfRatedLevel until the Assessment Engine adds verifiedScore)
│
├── middleware/
│   ├── authMiddleware.js        authenticate() — verifies JWT (HS256 pinned), sets req.user
│   ├── profileMiddleware.js     attachProfile() — resolves req.profile from req.user.id
│   ├── roleMiddleware.js        requireRole([...]) — checks the user's CURRENT role in the DB, not the JWT payload
│   ├── rateLimiters.js          globalLimiter (300/15min all routes), authLimiter (10/15min auth routes)
│   ├── errorHandler.js          errorHandler, notFoundHandler, asyncHandler (wraps async route handlers)
│   └── uploadMiddleware.js      uploadResumeFile (multer, memoryStorage, 5MB, PDF only), handleUploadError
│
├── validators/
│   ├── authValidators.js        registerValidation, loginValidation, handleValidationErrors (shared by everything else)
│   ├── profileValidators.js     validators for the 7 singular profile sections
│   ├── profileListValidators.js validators for the 10 list-based profile sections
│   ├── jobValidators.js         listJobsValidation — query filters for GET /api/v1/jobs
│   ├── applicationValidators.js applyToJobValidation — coverNote only
│   ├── adminValidators.js       company + job posting + required-skill create/update validators
│   └── adminApplicationValidators.js updateApplicationStatusValidation
│
├── controllers/
│   ├── authController.js        register(), login()
│   ├── profileController.js     getFullProfile() + upsert<Section>() for the 7 singular sections
│   ├── profileListController.js list/create/update/delete × 10 sections (40 functions)
│   ├── resumeController.js      uploadResume(), downloadResume(), deleteResume()
│   ├── jobController.js         listOpenJobs(), getOpenJob() — OPEN jobs only, filters + search
│   ├── eligibilityController.js getJobEligibility(), getJobMatches() — fetches claims/requirements, calls the pure service
│   ├── applicationController.js applyToJob(), listMyApplications(), withdrawApplication()
│   ├── adminController.js       company CRUD, job posting CRUD, status transitions (DRAFT→OPEN sets postedAt), required skills
│   └── adminApplicationController.js listJobApplicants(), updateApplicationStatus(), downloadApplicantResume()
│
├── routes/
│   ├── authRoutes.js            /api/v1/auth/*
│   ├── profileRoutes.js         /api/v1/profile/me, /me/<7 sections>, /me/job-matches, /me/applications (+ /withdraw)
│   ├── profileListRoutes.js     /api/v1/profile/<10 sections> (shares prefix with profileRoutes.js — see flow.md)
│   ├── resumeRoutes.js          /api/v1/resume
│   ├── jobRoutes.js             /api/v1/jobs — browsing needs auth only; eligibility + apply additionally run attachProfile, scoped PER-ROUTE
│   └── adminRoutes.js           /api/v1/admin/* — router.use(authenticate, requireRole(['ADMIN'])) once at the top; all admin routes live in this single file
│
└── (docs)                       Architecture.md, Constraints.md, Decision.md, flow.md — at the repo ROOT, not in docs/
```

---

## Data Model Map

```
User  (auth identity: email, passwordHash, role, status)
  └── Profile  (1:1, aggregate root for the 18 sections below
                and the candidate side of Applications)
        ├── BasicInfo            (1:1)  — name, dob, gender, phone [ENCRYPTED]
        ├── ProfilePhotoHeadline (1:1)
        ├── Address              (1:1)
        ├── EducationEntry       (1:many)
        ├── ExperienceEntry      (1:many)
        ├── SkillClaim           (1:many) → references Skill (master table)
        ├── Certification        (1:many)
        ├── Project              (1:many)
        ├── CareerSummary        (1:1)
        ├── PreferredRole        (1:many)
        ├── PreferredLocation    (1:many)
        ├── SalaryExpectation    (1:1)
        ├── AvailabilitySetting  (1:1)
        ├── LanguageKnown        (1:many)
        ├── SocialLink           (1:many)
        ├── Resume               (1:1)
        ├── Reference            (1:many) — contactInfo [ENCRYPTED]
        └── PrivacyConsent       (1:1)

Skill  (master list: name, category)
  ← referenced by SkillClaim.skillId, JobRequiredSkill.skillId

Company  ──< JobPosting            (1:many)
              ├──< JobRequiredSkill (1:many, FK to Skill,
              │                     @@unique([jobPostingId, skillId]),
              │                     minimumLevel 1–5, isRequired must/nice-have)
              └──< Application      (1:many)

Profile ──< Application            (1:many, @@unique([profileId, jobPostingId])
                                    — duplicate applications blocked at the DB)
              status: ApplicationStatus enum (APPLIED → UNDER_REVIEW →
              SHORTLISTED → HIRED / REJECTED, or WITHDRAWN by the candidate)

Job status lifecycle: JobStatus enum DRAFT → OPEN → CLOSED.
postedAt is null while DRAFT and is set server-side on the DRAFT→OPEN
transition — the client never sets status or postedAt directly.

[PLANNED, NOT YET IMPLEMENTED — see Decisions.md "Assessment Engine"]
Question, CodingQuestion, TestCase, AssessmentSession,
AssessmentAnswer, CodingSubmission
```

**Cascade rules:** `User → Profile` = `Restrict` (no auto-delete).
`Profile → (all 18 sections)` = `Cascade` (deleting a Profile cleans
up everything under it). `Profile → Application` also cascades, but
`Application → JobPosting` = `Restrict` — a job with applications on it
cannot be deleted (admin must handle the applications first); admin
routes that attach JobRequiredSkill rows likewise block job deletion
with a 409 while skills are attached.

---

## Cross-Cutting Concerns (apply everywhere, not tied to one file)

- **Ownership enforcement**: every candidate-facing endpoint scopes
  its query by `req.profile.id`, resolved server-side from the JWT —
  never from client input. See Constraints.md.
- **Consistent response shape**: every endpoint responds
  `{ success: boolean, message?: string, data?: ..., errors?: [...] }`.
- **Error handling**: controllers either use `asyncHandler` (from
  `middleware/errorHandler.js`) to auto-forward thrown errors to
  `next()`, or (in `authController.js` and `resumeController.js`)
  use manual `try/catch` — both patterns exist in the codebase today,
  both are acceptable, but a given file should stay consistent with
  whichever pattern it already uses.
- **Encryption**: only two fields in the whole schema are encrypted
  (`BasicInfo.phone`, `Reference.contactInfo`) — see Decisions.md for
  exactly why those two and not others.
- **Role enforcement**: admin routes check the user's CURRENT role
  against the DB via `requireRole` (`middleware/roleMiddleware.js`),
  never the JWT payload — the token only carries `{ id, type }` and
  already-issued tokens must not outlive a role change.
- **attachProfile is scoped, not global**: job BROWSING routes run with
  `authenticate` only; `attachProfile` is added per-route only where a
  Profile is actually needed (eligibility, apply, all of /profile/*).
  Admin routes never use attachProfile at all.

---

## External Dependencies

| Dependency | Used for | Notes |
|---|---|---|
| PostgreSQL (hosted on Supabase) | Primary datastore | Connect via Session Pooler (5432), not Transaction Pooler (6543) — see Decisions.md |
| Prisma 7.10.0 | ORM + migrations | `prisma` is a devDependency, `@prisma/client` is a runtime dependency; runtime uses the `@prisma/adapter-pg` driver adapter (see `config/prisma.js`) |
| bcryptjs | Password hashing | 12 rounds |
| jsonwebtoken | Auth tokens | HS256 only, 1-hour expiry, no refresh token yet (known gap) |
| multer | Resume file upload parsing | memoryStorage only |
| express-validator | Request validation | — |
| express-rate-limit | Rate limiting | — |
| helmet | Security headers | — |
| Judge0 (RapidAPI) | [PLANNED] Code execution for the Assessment Engine | Not yet integrated |
