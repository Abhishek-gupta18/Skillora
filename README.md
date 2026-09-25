# Skillora — AI-Powered Career & Skill Intelligence Platform (Backend)

## Overview

Skillora is a backend API platform for career and skill intelligence, built with Node.js, Express, and Prisma ORM. It provides authentication, profile management, resume handling, job browsing, eligibility matching, and job application capabilities.

## Tech Stack

- **Runtime**: Node.js (v24+)
- **Framework**: Express 5
- **Database**: PostgreSQL with Prisma 7 ORM
- **Authentication**: JWT with bcrypt password hashing
- **Security**: Helmet, CORS, Rate Limiting
- **Validation**: express-validator
- **File Upload**: Multer
- **Encryption**: AES-256-GCM for sensitive data

## Project Structure

```
skillora/
├── config/
│   ├── env.js          # Environment validation
│   └── prisma.js       # Prisma client with driver adapter
├── controllers/        # Request handlers
│   ├── adminController.js
│   ├── applicationController.js
│   ├── authController.js
│   ├── eligibilityController.js
│   ├── jobController.js
│   ├── profileController.js
│   ├── profileListController.js
│   └── resumeController.js
├── middleware/
│   ├── authMiddleware.js
│   ├── errorHandler.js
│   ├── profileMiddleware.js
│   └── rateLimiters.js
├── routes/             # API route definitions
│   ├── adminRoutes.js
│   ├── authRoutes.js
│   ├── jobRoutes.js
│   ├── profileRoutes.js
│   ├── profileListRoutes.js
│   └── resumeRoutes.js
├── services/           # Pure business logic (no I/O)
│   └── eligibilityService.js
├── utils/              # Utility functions
│   ├── encryption.js
│   ├── fileIntegrity.js
│   ├── fileValidation.js
│   └── password.js
├── validators/         # Input validation rules
│   ├── adminValidators.js
│   ├── applicationValidators.js
│   ├── authValidators.js
│   ├── jobValidators.js
│   ├── profileListValidators.js
│   └── profileValidators.js
├── prisma/
│   ├── schema.prisma   # Database schema (490+ lines)
│   ├── seed.js         # Database seeding
│   └── seedAdmin.js    # Admin user seeding
├── docs/               # Architecture & decision records
│   ├── Architecture.md
│   ├── Constraints.md
│   ├── Decisions.md
│   └── flow.md
└── server.js           # Application entry point
```

## Database Schema

The Prisma schema (`prisma/schema.prisma`) defines a comprehensive career profile system:

- **User & Auth**: User, roles (CANDIDATE/ADMIN), status, email verification
- **Profile Sections (18)**: BasicInfo, PhotoHeadline, Address, Education, Experience, Skills, Certifications, Projects, CareerSummary, PreferredRoles, PreferredLocations, SalaryExpectation, Availability, Languages, SocialLinks, Resume, References, PrivacyConsent
- **Master Data**: Skill (with categories), ApplicationStatus enum
- **Job Board**: Company, JobPosting, JobRequiredSkill, Application
- **Assessment Stub**: Assessment (for future engine)

Sensitive fields (phone, contactInfo) are stored encrypted using AES-256-GCM.

## Setup & Installation

### Prerequisites

- Node.js 20+
- PostgreSQL database (or use `prisma dev` for local dev server)

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
- `ENCRYPTION_KEY` — 32 chars (generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- `PORT` — Server port (default: 5000)
- `FRONTEND_ORIGIN` — CORS origin
- `NODE_ENV` — development|production|test

### 3. Database Setup

**Option A: Local Prisma Dev Server (recommended for development)**
```bash
npx prisma dev --detach
# Use the DATABASE_URL it outputs in your .env
```

**Option B: Existing PostgreSQL**
Update `DATABASE_URL` in `.env` to your database.

### 4. Generate Prisma Client & Push Schema

```bash
npx prisma generate
npx prisma db push
```

### 5. (Optional) Seed Database

```bash
npm run prisma:seed
# Seed admin user:
node prisma/seedAdmin.js
```

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
| POST | `/api/v1/auth/register` | User registration |
| POST | `/api/v1/auth/login` | User login |

### Profile (Candidate — requires profile)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/profile/me` | Get full profile |
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
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/profile/list` | List profiles with filters |
| GET | `/api/v1/profile/list/:id` | Get public profile |
| POST | `/api/v1/profile/list/:id/education` | Add education entry |
| PATCH | `/api/v1/profile/list/:id/education/:eduId` | Update education entry |
| DELETE | `/api/v1/profile/list/:id/education/:eduId` | Delete education entry |
| ... | ... | Similar for experience, skills, certifications, projects, languages, social-links, references |

### Resume
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/resume/upload` | Upload resume (PDF, encrypted) |
| GET | `/api/v1/resume` | Get resume metadata |

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

## Work Done

### ✅ Milestone 1: Foundation
- Project initialization with Express 5
- Environment & configuration with strict validation
- Prisma 7 with driver adapter (`@prisma/adapter-pg`)
- JWT authentication with bcrypt
- 18-section profile management with encryption
- Resume upload with integrity checks
- Security middleware (Helmet, CORS, Rate Limiting)
- Centralized error handling

### ✅ Milestone 2: Job Board & Matching
- Admin job/company management (CRUD, status transitions)
- Candidate job browsing (OPEN only, filters + search)
- Eligibility service (pure function, self-rated level matching)
- Single-job eligibility endpoint
- Ranked job matches endpoint
- Job applications (apply, list, withdraw)
- Duplicate application prevention (DB unique constraint)
- Terminal status protection (cannot withdraw REJECTED/WITHDRAWN/HIRED)

## Scripts

```json
{
  "start": "node server.js",
  "prisma:generate": "prisma generate",
  "prisma:migrate": "prisma migrate dev",
  "prisma:studio": "prisma studio",
  "prisma:seed": "node prisma/seed.js"
}
```

## Key Architectural Decisions

1. **Layered Architecture**: Routes → Middleware → Controllers → Services → Prisma
2. **Controller/Service Separation**: Services are pure functions (testable), Controllers handle I/O
3. **Profile Attachment Scoped**: Only routes needing profile run `attachProfile` middleware
4. **Candidate Job Filtering**: Hardcoded `status: 'OPEN'` in same query as ID lookup
5. **Express 5 Query Params**: Use `matchedData(req)` not `req.query` for sanitized values
6. **Ownership Checks**: Single combined query (`findFirst({ id, profileId })`) for identical 404
6. **Status Immutability**: Client never sets status; defaults and transitions server-side

See `docs/Decisions.md` for full decision log and `docs/Architecture.md` for layer details.

## Notes

- **Prisma 7** requires driver adapter — configured via `@prisma/adapter-pg` in `config/prisma.js`
- No `prisma.config.ts` needed when using adapter directly in code
- Sensitive data encrypted at application layer before storage
- Profile sections use cascade delete with Profile as aggregate root
- Rate limiter trusts proxy (`app.set('trust proxy', 1)`) for deployment behind reverse proxies
- Assessment Engine (verifiedScore) deferred — eligibility currently uses selfRatedLevel only