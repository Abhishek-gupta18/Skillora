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
- `RAPIDAPI_KEY`, `JUDGE0_API_HOST`, `JUDGE0_API_URL` — only needed if the coding-assessment (Judge0) feature is re-enabled; MCQ assessments do not require them

### 3. Database Setup

**Option A: Local Prisma Dev Server (recommended for development)**
```bash
npx prisma dev --detach
# Use the DATABASE_URL it outputs in your .env
```

**Option B: Existing PostgreSQL (e.g. Supabase)**
Update `DATABASE_URL` in `.env`. Supabase projects require `certs/supabase-ca.crt` — `config/prisma.js` enforces TLS with CA verification (verify-full). Download the certificate from Supabase Dashboard > Project Settings > Database > SSL Configuration and place it at `certs/supabase-ca.crt`.

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

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | User registration (creates Profile + BasicInfo + PrivacyConsent) |
| POST | `/api/v1/auth/login` | User login (JWT, 1h) |

### Profile (Candidate — requires profile)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/profile/me` | Get full profile |
| GET | `/api/v1/profile/me/dashboard` | Aggregated dashboard (profile completion, claims, roadmaps) |
| PATCH | `/api/v1/profile/me/basic-info` | Update basic info |
| PATCH | `/api/v1/profile/me/photo-headline` | Update photo & headline |
| PATCH | `/api/v1/profile/me/address` | Update address |
| PATCH | `/api/v1/profile/me/career-summary` | Update career summary |
| PATCH | `/api/v1/profile/me/salary-expectation` | Update salary expectation |
| PATCH | `/api/v1/profile/me/availability` | Update availability |
| PATCH | `/api/v1/profile/me/privacy-consent` | Update privacy consent |
| GET | `/api/v1/profile/me/job-matches` | All open jobs ranked by eligibility |
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
| POST | `/api/v1/assessments/start` | Start a session for a claimed skill — 10 random MCQs at the difficulty derived from the claimed level; expires in 1h; one IN_PROGRESS session per skill |
| GET | `/api/v1/assessments/:sessionId/questions` | Get answered answers for an active session |
| POST | `/api/v1/assessments/:sessionId/answers` | Submit/overwrite one answer `{questionId, selectedOptionIndex}` (correctness is not revealed per answer) |
| POST | `/api/v1/assessments/:sessionId/complete` | Complete session — score = correct/answered × 100; passing updates `SkillClaim.verifiedScore` |

Pass thresholds by claimed level: level 1–2 → 70%, level 3 → 80%, level 4 → 85%, level 5 → 90%.

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
| GET | `/api/v1/jobs/:id/eligibility` | My eligibility for a specific job |
| POST | `/api/v1/jobs/:id/apply` | Apply to an open job (coverNote optional) |

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
- **Rate limiting**: global 300 req/15min, auth endpoints 10 req/15min; `trust proxy = 1` assumes exactly one reverse proxy — remove/adjust `app.set('trust proxy', 1)` when deployed without one
- **Profile sections** use cascade delete with Profile as aggregate root
- **Judge0 (coding assessments)** is paused: `services/judge0Service.js` is not wired into any route; MCQ assessments are the live engine
- **Question bank**: Wave 1 skills (JavaScript, Python, Java, C++, SQL) are authored under `prisma/questions/`; new skills require both a `Skill` row (via `prisma/seed`) and a question set before assessments work for them
