# Skillora — AI-Powered Career & Skill Intelligence Platform

## Overview

Skillora is a career and skill intelligence platform. This repository contains the **backend REST API** (Node.js, Express, Prisma ORM). The frontend is a React (Vite) SPA being integrated separately — point it at this API (default base URL `http://localhost:5000`).

The backend provides authentication, an 18-section candidate profile system, resume handling (PDF), a job board with eligibility matching and applications, an interview experience board (crowd-sourced), an MCQ-based skill assessment engine with verified scores, and skill roadmaps with progress tracking.

## Tech Stack

- **Runtime**: Node.js (v20+)
- **Framework**: Express 5
- **Database**: PostgreSQL with Prisma 7 ORM (driver adapter `@prisma/adapter-pg`)
- **Authentication**: JWT (HS256, 1h expiry) with bcrypt password hashing
- **Security**: Helmet, CORS, Rate Limiting (global + auth-specific)
- **Validation**: express-validator
- **File Upload**: Multer (memory storage, magic-byte PDF validation, SHA-256 integrity checks)
- **Encryption**: AES-256-GCM for sensitive data (phone, contact info)
- **TLS**: Supabase CA certificate for verified (verify-full) DB connections

## Project Structure

```
skillora/
├── config/
│   ├── env.js             # Environment validation
│   └── prisma.js          # Prisma client with driver adapter + TLS CA
├── controllers/           # Request handlers
│   ├── adminApplicationController.js
│   ├── adminController.js
│   ├── adminInterviewExperienceController.js
│   ├── adminRoadmapController.js
│   ├── applicationController.js
│   ├── assessmentController.js
│   ├── authController.js
│   ├── eligibilityController.js
│   ├── interviewExperienceController.js
│   ├── jobController.js
│   ├── profileController.js
│   ├── profileListController.js
│   ├── resumeController.js
│   ├── roadmapController.js
│   └── skillController.js
├── middleware/
│   ├── authMiddleware.js
│   ├── errorHandler.js
│   ├── profileMiddleware.js
│   ├── rateLimiters.js
│   ├── roleMiddleware.js
│   └── uploadMiddleware.js
├── routes/                # API route definitions
│   ├── adminRoutes.js
│   ├── assessmentRoutes.js
│   ├── authRoutes.js
│   ├── interviewExperienceRoutes.js
│   ├── jobRoutes.js
│   ├── profileListRoutes.js
│   ├── profileRoutes.js
│   ├── resumeRoutes.js
│   └── skillRoutes.js
├── services/              # Business logic
│   ├── eligibilityService.js
│   ├── judge0Service.js   # (coding/Judge0 feature paused — not wired)
│   ├── profileCompletionService.js
│   └── roadmapProgressService.js
├── utils/                 # Utility functions
│   ├── encryption.js
│   ├── fileIntegrity.js
│   ├── fileValidation.js
│   ├── password.js
│   └── skillLevelBands.js
├── validators/            # Input validation rules
├── prisma/
│   ├── schema.prisma      # Database schema
│   ├── seed.js            # Skill master-data seeding (idempotent)
│   ├── seedAdmin.js       # Admin user seeding (ADMIN_EMAIL / ADMIN_PASSWORD)
│   ├── seedQuestions.js   # Question bank seeding (idempotent)
│   └── questions/         # Authored MCQs per skill per difficulty
├── docs/                  # Constraints, architecture & decision records
│   ├── Constraints.md
│   ├── Architecture.md
│   ├── Decisions.md
│   └── flow.md
└── server.js              # Application entry point
```

## Database Schema

The Prisma schema (`prisma/schema.prisma`) defines a comprehensive career platform model:

- **User & Auth**: User, roles (CANDIDATE/ADMIN), status, email verification
- **Profile Sections (18)**: BasicInfo, PhotoHeadline, Address, Education, Experience, Skills, Certifications, Projects, CareerSummary, PreferredRoles, PreferredLocations, SalaryExpectation, Availability, Languages, SocialLinks, Resume, References, PrivacyConsent
- **Master Data**: Skill (with categories), Question (MCQ with difficulty), ApplicationStatus enum
- **Job Board**: Company, JobPosting, JobRequiredSkill, Application
- **Assessment**: AssessmentSession, AssessmentAnswer (MCQ scoring, verified scores)
- **Interview Experiences**: InterviewExperience + nested rounds (crowd-sourced, anonymous by default)
- **Roadmaps**: RoadmapTemplate + steps (admin), RoadmapAssignment + step progress (candidate)

Sensitive fields (phone, contactInfo) are stored encrypted using AES-256-GCM.

## Setup & Installation

### Prerequisites

- Node.js 20+
- PostgreSQL database (Supabase recommended — TLS cert setup below)

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Min 32 chars (generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)
- `ENCRYPTION_KEY` — 64-char hex, 32 bytes (generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- `PORT` — Server port (default: 5000)
- `FRONTEND_ORIGIN` — CORS origin
- `NODE_ENV` — development|production|test

Optional:
- `RESUME_STORAGE_DIR` — resume file storage (default `./resume-storage`)
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — for `prisma/seedAdmin.js`
- `JWT_EXPIRES_IN` — JWT expiry (e.g. `7d`, `1h`, `30m`). Default: `7d`.
- `TRUST_PROXY` — Trust proxy for rate limiter IP detection behind reverse proxy. `false` to disable; `1` (default) for one proxy; `2` for two proxies, etc.
- `RAPIDAPI_KEY`, `JUDGE0_API_HOST`, `JUDGE0_API_URL` — only needed if the coding-assessment (Judge0) feature is re-enabled; MCQ assessments do not require them

### 3. Database Setup

**Option A: Local Prisma Dev Server (recommended for development)**
```bash
npx prisma dev --detach
# Use the DATABASE_URL it outputs in your .env
```

**Option B: Existing PostgreSQL (e.g. Supabase)**
Update `DATABASE_URL` in `.env`. Supabase projects require `certs/supabase-ca.crt` — `config/prisma.js` enforces TLS with CA verification (verify-full). Download the certificate from Supabase Dashboard > Project Settings > Database > SSL Configuration and place it at `certs/supabase-ca.crt`.

**Important**: `DATABASE_SSL=false` is ONLY for a local Postgres WITHOUT TLS. For Supabase, leave `DATABASE_SSL` UNSET so TLS with the CA certificate is used (set `DATABASE_SSL_CA_PATH` if your CA cert is not at `certs/supabase-ca.crt`).

### 4. Generate Prisma Client & Push Schema

```bash
npx prisma generate
npx prisma db push
```

### 5. Seed Data

```bash
npm run prisma:seed            # Skill master data (idempotent)
node prisma/seedAdmin.js       # Admin user (requires ADMIN_EMAIL / ADMIN_PASSWORD)
npm run prisma:seed:questions  # MCQ question bank (idempotent, keyed by skill name)
```

The question seed reads `prisma/questions/*.js` — one file per skill per difficulty (`<skill>-<easy|medium|hard>.js`), 15 questions each. Each question has `prompt`, `options` (4), and `correct` (option index). Sessions sample 10 random questions per attempt.

### 6. Start Server

```bash
npm start
# or
node server.js
```

Server runs on `http://localhost:5000` with health check at `/health`.

### 7. Run Verification Scripts

```bash
npm run verify:flow        # Full E2E: auth, assessments, retake gate, admin review
npm run verify:eligibility # Job matching, eligibility labels, cross-candidate comparison
```

> **Note**: The dev and production databases MUST be different. Never run verification scripts against a production database — they create/destroy test data.

---

## Local Setup (Quick Start)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your values (see "Environment Configuration" above)

# 3. Database: check migration status, then migrate
npx prisma migrate status
npx prisma migrate dev    # Creates and applies new migrations

# 4. Seed data (order matters!)
npm run prisma:seed            # Skill master data (idempotent)
npm run prisma:seed:questions  # MCQ question bank (idempotent)
npm run seed:admin             # Admin user (requires ADMIN_EMAIL / ADMIN_PASSWORD in .env)

# 5. Start server
npm start

# 6. Run verification
npm run verify:flow
npm run verify:eligibility
```

> ⚠️ **Important**: The development and production databases MUST be separate. Verification scripts create and destroy test data — never point them at a production database.

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | User registration (creates Profile + BasicInfo + PrivacyConsent) |
| POST | `/api/v1/auth/login` | User login (JWT, expiry from `JWT_EXPIRES_IN`, default 7d). Returns token with `tv` (tokenVersion). |
| GET | `/api/v1/auth/me` | Get current user + profile summary + profile completion % (requires profile) |
| POST | `/api/v1/auth/change-password` | Change password (requires current password). Rotates tokenVersion, returns new token. Rate limited (authLimiter). |
| POST | `/api/v1/auth/logout-all` | Revokes all tokens by incrementing tokenVersion. |

**Token revocation**: Password change, logout-all, or admin suspend increments `User.tokenVersion`; all existing tokens become invalid immediately. JWT payload includes `tv` (tokenVersion) and `id`. Expiry via `JWT_EXPIRES_IN` (default `7d`).

### Profile (Candidate — requires profile)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/profile/me` | Get full profile |
| GET | `/api/v1/profile/me/dashboard` | Aggregated dashboard (profile completion, claims, roadmaps). Returns `skillClaims` array with `{ skillId, skillName, selfRatedLevel, verifiedLevel, state: 'claimed' | 'verified' }`. |
| PATCH | `/api/v1/profile/me/basic-info` | Update basic info |
| PATCH | `/api/v1/profile/me/photo-headline` | Update photo & headline |
| PATCH | `/api/v1/profile/me/address` | Update address |
| PATCH | `/api/v1/profile/me/career-summary` | Update career summary |
| PATCH | `/api/v1/profile/me/salary-expectation` | Update salary expectation |
| PATCH | `/api/v1/profile/me/availability` | Update availability |
| PATCH | `/api/v1/profile/me/privacy-consent` | Update privacy consent |
| GET | `/api/v1/profile/me/job-matches` | All open jobs ranked by eligibility. Returns per-job: `jobId`, `title`, `companyName`, `eligibilityScore`, `isEligible`, `eligibilityLabel` ('eligible' | 'partially-eligible' | 'skill-gap'). |
| GET | `/api/v1/profile/me/applications` | List my applications |
| PATCH | `/api/v1/profile/me/applications/:id/withdraw` | Withdraw an application |

### Profile Lists (Candidate — requires profile)
Repeatable sections under `/api/v1/profile/<section>` with the same CRUD shape:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/profile/<section>` | List my entries for that section |
| POST | `/api/v1/profile/<section>` | Create an entry |
| PATCH | `/api/v1/profile/<section>/:id` | Update an entry |
| DELETE | `/api/v1/profile/<section>/:id` | Delete an entry |

`<section>` is one of: `education`, `experience`, `skills` (skill claims),
`certifications`, `projects`, `preferred-roles`, `preferred-locations`,
`languages`, `social-links`, `references`.

### Skills (Master Data — authenticated, any role)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/skills` | Master skill list `{id, name, category}`, sorted by category then name |

### Resume (Candidate — requires profile)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/resume` | Upload/replace resume — `multipart/form-data`, file field **must** be named `resume`; PDF only (magic-byte check), max 5MB; returns `{id, uploadedAt}` |
| GET | `/api/v1/resume` | Download resume (integrity-verified PDF stream) |
| DELETE | `/api/v1/resume` | Delete resume |

### Assessments (MCQ — Candidate, requires profile + claimed skill)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/assessments/start` | Start a session for a claimed skill — 10 random MCQs at the difficulty derived from the claimed level; expires in 1h; one IN_PROGRESS session per skill. Returns questions with `position` (0–9). **Retake gate**: if a COMPLETED session exists for the same (skillId, targetLevel), an APPROVED, unconsumed RetakeRequest is required; otherwise returns 403. |
| GET | `/api/v1/assessments/:sessionId/questions` | Get session questions ordered by position, with any submitted answers. Returns `{ sessionId, expiresAt, questions: [{id, promptText, options, difficulty, position}], answers: [{questionId, selectedOptionIndex}] }`. Never returns `correctOptionIndex` or `isCorrect`. |
| POST | `/api/v1/assessments/:sessionId/answers` | Submit/overwrite one answer `{questionId, selectedOptionIndex}`. Validates the question belongs to this session (422 if not). Correctness is not revealed per answer. |
| POST | `/api/v1/assessments/:sessionId/complete` | Complete session — score = correct among bound questions / total bound questions × 100; unanswered = wrong. Atomic completion prevents double-complete (409). Passing updates `SkillClaim.verifiedScore` (only when passed, never reset on fail). Response includes `totalQuestions`. |
| POST | `/api/v1/assessments/retake-requests` | Create a retake request for a COMPLETED session owned by the caller. Body: `{ sessionId, reasonType: 'SYSTEM_FAILURE'|'OTHER_VALID_REASON', reason (20–1000 chars), evidenceNote? (max 1000) }`. Rate limited (5/hour). One PENDING request per (profileId, skillId) allowed (409). |
| GET | `/api/v1/assessments/retake-requests` | List caller's own retake requests with status and review details. |

Pass thresholds by claimed level: level 1–2 → 70%, level 3 → 80%, level 4 → 85%, level 5 → 90%.

Question bank integrity: correct option positions are balanced at seed time (utils/questionBalance.js) so each index appears ~25% across non-pinned questions. Pinned questions ("all of the above", "none of the above", "both A and B") are never rebalanced. Run `npm run questions:check` to verify.

Retake gate: a candidate may retake an assessment for a given level ONLY if they have an APPROVED, unconsumed RetakeRequest for that (skillId, targetLevel). After approval, the request is consumed atomically when the new session is created. Level upgrades (higher targetLevel than any prior COMPLETED session) are allowed without a retake request.

### Interview Experiences (crowd-sourced board — authenticated)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/interview-experiences` | Browse with filters: `companyName`, `roleTitle`, `outcome` (no pagination — returns all) |
| GET | `/api/v1/interview-experiences/:id` | Single experience with rounds (never includes author identity) |
| POST | `/api/v1/interview-experiences` | Create experience with nested rounds (requires profile; `narrative` max 5000 chars) |
| DELETE | `/api/v1/interview-experiences/:id` | Delete own experience (identical 404 if missing or not yours) |

### Roadmaps (Candidate — requires profile)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/profile/me/roadmaps` | Request a roadmap for a skill from an admin template |
| GET | `/api/v1/profile/me/roadmaps` | List my roadmap assignments |
| GET | `/api/v1/profile/me/roadmaps/:assignmentId` | Get assignment with steps and progress |
| PATCH | `/api/v1/profile/me/roadmaps/:assignmentId/steps/:stepId` | Update step progress (sets `completedAt`) |
| PATCH | `/api/v1/profile/me/roadmaps/:assignmentId/abandon` | Abandon an assignment |

### Job Browsing (Candidate — authenticated, no profile needed)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/jobs` | List open jobs (filters: search, employmentType, experienceLevel, location, isRemote) |
| GET | `/api/v1/jobs/:id` | Get single open job |
| GET | `/api/v1/jobs/:id/eligibility` | My eligibility for a specific job. Returns per-skill: `minimumLevel`, `isRequired`, `selfRatedLevel`, `verifiedLevel`, `gap`, `status` ('verified-match' | 'below-level' | 'unverified' | 'not-claimed'), plus `eligibilityScore`, `isEligible`, `eligibilityLabel`. |
| POST | `/api/v1/jobs/:id/apply` | Apply to an open job (coverNote optional) |

**Verified-only eligibility:** Only VERIFIED skills count. A skill matches only when `verifiedLevel !== null && verifiedLevel >= minimumLevel`. Self-rated level is shown but NOT used for eligibility. `eligibilityLabel`: 'eligible' (all required matched), 'partially-eligible' (score ≥ 50), 'skill-gap' (score < 50).

### Admin (requires ADMIN role)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/admin/companies` | Create company |
| GET | `/api/v1/admin/companies` | List companies |
| GET | `/api/v1/admin/companies/:id` | Get company |
| PATCH | `/api/v1/admin/companies/:id` | Update company |
| POST | `/api/v1/admin/jobs` | Create job posting (status=DRAFT) |
| GET | `/api/v1/admin/jobs` | List all jobs (all statuses) |
| GET | `/api/v1/admin/jobs/:id` | Get job |
| PATCH | `/api/v1/admin/jobs/:id` | Update job (whitelist fields) |
| PATCH | `/api/v1/admin/jobs/:id/status` | Update status (DRAFT→OPEN sets postedAt) |
| DELETE | `/api/v1/admin/jobs/:id` | Delete job (409 if skills attached) |
| POST | `/api/v1/admin/jobs/:jobId/required-skills` | Add required skill |
| DELETE | `/api/v1/admin/jobs/:jobId/required-skills/:skillReqId` | Remove required skill |
| GET | `/api/v1/admin/jobs/:jobId/applications` | List applicants for a job (works for CLOSED jobs too) |
| PATCH | `/api/v1/admin/applications/:id/status` | Change applicant status (UNDER_REVIEW/SHORTLISTED/REJECTED/HIRED only) |
| GET | `/api/v1/admin/applications/:id/resume` | Download applicant's resume |
| DELETE | `/api/v1/admin/interview-experiences/:id` | Moderation: delete any interview experience |
| POST | `/api/v1/admin/roadmap-templates` | Create roadmap template |
| GET | `/api/v1/admin/roadmap-templates` | List templates |
| GET | `/api/v1/admin/roadmap-templates/:id` | Get template with steps |
| PATCH | `/api/v1/admin/roadmap-templates/:id` | Update template |
| DELETE | `/api/v1/admin/roadmap-templates/:id` | Delete template |
| POST | `/api/v1/admin/roadmap-templates/:templateId/steps` | Add step |
| PATCH | `/api/v1/admin/roadmap-templates/:templateId/steps/:id` | Update step |
| DELETE | `/api/v1/admin/roadmap-templates/:templateId/steps/:id` | Remove step |
| GET | `/api/v1/admin/retake-requests` | Paginated list of retake requests. Query: `status` (PENDING|APPROVED|REJECTED), `page` (default 1), `limit` (default 20, max 50). Returns `{ requests, pagination }`. |
| PATCH | `/api/v1/admin/retake-requests/:id` | Approve or reject a PENDING retake request. Body: `{ status: 'APPROVED'|'REJECTED', reviewNote? }`. Stamps `reviewedByUserId` and `reviewedAt`. 409 if not PENDING. |

## Scripts

```json
{
  "start": "node server.js",
  "prisma:generate": "prisma generate",
  "prisma:migrate": "prisma migrate dev",
  "prisma:studio": "prisma studio",
  "prisma:seed": "node prisma/seed.js",
  "prisma:seed:questions": "node prisma/seedQuestions.js",
  "seed:admin": "node prisma/seedAdmin.js"
}
```

## Key Architectural Decisions

1. **Layered Architecture**: Routes → Middleware → Controllers → Services → Prisma
2. **Controller/Service Separation**: Services are pure functions (testable), Controllers handle I/O
3. **Profile Attachment Scoped**: Only routes needing profile run `attachProfile` middleware
4. **Candidate Job Filtering**: Hardcoded `status: 'OPEN'` in same query as ID lookup
5. **Express 5 Query Params**: Use `matchedData(req)` not `req.query` for sanitized values
6. **Ownership Checks**: Single combined query (`findFirst({ id, authorProfileId/profileId })`) for identical 404
7. **Status Immutability**: Client never sets status; defaults and transitions server-side
8. **DB-Authoritative Roles**: `requireRole` queries the user's current role from the DB, never the JWT payload
9. **Assessment Integrity**: Per-answer correctness is never returned; sessions expire after 1h; question bank is authored offline and seeded idempotently

See `docs/Decisions.md` for the full decision log and `docs/Architecture.md` for layer details. `docs/Constraints.md` lists invariants that must never change without explicit review.

## Notes

- **Prisma 7** requires the driver adapter — configured via `@prisma/adapter-pg` in `config/prisma.js`
- **TLS**: DB connections verify against `certs/supabase-ca.crt` (Supabase CA). The cert comes from the Supabase Dashboard (Project Settings > Database > SSL Configuration), not from any public URL
- **Encryption**: Sensitive data is encrypted at the application layer before storage (AES-256-GCM, versioned payload `v1:<iv>:<tag>:<ciphertext>`)
- **Rate limiting**: global 300 req/15min, auth endpoints 10 req/15min; `trust proxy` configured via `TRUST_PROXY` env var (`1` default, `false` to disable) — adjust for your reverse proxy setup
- **Profile sections** use cascade delete with Profile as aggregate root
- **Judge0 (coding assessments)** is paused: `services/judge0Service.js` is not wired into any route; MCQ assessments are the live engine
- **Question bank**: Wave 1 skills (JavaScript, Python, Java, C++, SQL) are authored under `prisma/questions/`; new skills require both a `Skill` row (via `prisma/seed`) and a question set before assessments work for them
