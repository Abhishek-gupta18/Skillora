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
| **Service** (`utils/` here, since there's no separate `services/` layer yet) | Pure logic with no knowledge of Express (`encrypt`/`decrypt`, `hashPassword`/`comparePassword`, `hashFileBuffer`, `isValidPdf`) | Import `req`/`res`, or call Prisma directly |
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
│   └── seed.js                  Populates the Skill master-data table (idempotent, safe to re-run)
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
├── middleware/
│   ├── authMiddleware.js        authenticate() — verifies JWT, sets req.user
│   ├── profileMiddleware.js     attachProfile() — resolves req.profile from req.user.id
│   ├── rateLimiters.js          globalLimiter (300/15min all routes), authLimiter (10/15min auth routes)
│   ├── errorHandler.js          errorHandler, notFoundHandler, asyncHandler (wraps async route handlers)
│   └── uploadMiddleware.js      uploadResumeFile (multer, memoryStorage, 5MB, PDF only), handleUploadError
│
├── validators/
│   ├── authValidators.js        registerValidation, loginValidation, handleValidationErrors (shared by everything else)
│   ├── profileValidators.js     validators for the 7 singular profile sections
│   └── profileListValidators.js validators for the 10 list-based profile sections
│
├── controllers/
│   ├── authController.js        register(), login()
│   ├── profileController.js     getFullProfile() + upsert<Section>() for the 7 singular sections
│   ├── profileListController.js list/create/update/delete × 10 sections (40 functions)
│   └── resumeController.js      uploadResume(), downloadResume(), deleteResume()
│
├── routes/
│   ├── authRoutes.js            /api/v1/auth/*
│   ├── profileRoutes.js         /api/v1/profile/me and /api/v1/profile/me/<7 sections>
│   ├── profileListRoutes.js     /api/v1/profile/<10 sections> and /<id> (shares prefix with profileRoutes.js — see flow.md)
│   └── resumeRoutes.js          /api/v1/resume
│
└── docs/                        This documentation (Decisions.md, flow.md, Architecture.md, Constraints.md)
```

---

## Data Model Map

```
User  (auth identity: email, passwordHash, role, status)
  └── Profile  (1:1, the aggregate root for everything below)
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
  ← referenced by SkillClaim.skillId

Company, JobPosting  (minimal stubs — full fields arrive in a future
                       milestone, not yet built)

[PLANNED, NOT YET IMPLEMENTED — see Decisions.md "Assessment Engine"]
Question, CodingQuestion, TestCase, AssessmentSession,
AssessmentAnswer, CodingSubmission
```

**Cascade rule:** `User → Profile` = `Restrict` (no auto-delete).
`Profile → (all 18 sections)` = `Cascade` (deleting a Profile cleans
up everything under it).

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

---

## External Dependencies

| Dependency | Used for | Notes |
|---|---|---|
| PostgreSQL (hosted on Supabase) | Primary datastore | Connect via Session Pooler (5432), not Transaction Pooler (6543) — see Decisions.md |
| Prisma 7.10.0 | ORM + migrations | `prisma` is a devDependency, `@prisma/client` is a runtime dependency |
| bcryptjs | Password hashing | 12 rounds |
| jsonwebtoken | Auth tokens | HS256 only, 1-hour expiry, no refresh token yet (known gap) |
| multer | Resume file upload parsing | memoryStorage only |
| express-validator | Request validation | — |
| express-rate-limit | Rate limiting | — |
| helmet | Security headers | — |
| Judge0 (RapidAPI) | [PLANNED] Code execution for the Assessment Engine | Not yet integrated |
