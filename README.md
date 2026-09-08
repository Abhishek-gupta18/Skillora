# Skillora — AI-Powered Career & Skill Intelligence Platform (Backend)

## Overview

Skillora is a backend API platform for career and skill intelligence, built with Node.js, Express, and Prisma ORM. It provides authentication, profile management, resume handling, and skill assessment capabilities.

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
│   ├── authController.js
│   ├── profileController.js
│   ├── profileListController.js
│   └── resumeController.js
├── middleware/
│   ├── errorHandler.js
│   └── rateLimiters.js
├── routes/             # API route definitions
│   ├── authRoutes.js
│   ├── profileRoutes.js
│   ├── profileListRoutes.js
│   └── resumeRoutes.js
├── utils/              # Utility functions
│   ├── encryption.js
│   ├── fileIntegrity.js
│   ├── fileValidation.js
│   └── password.js
├── validators/         # Input validation rules
├── prisma/
│   ├── schema.prisma   # Database schema (400+ lines)
│   └── seed.js         # Database seeding
└── server.js           # Application entry point
```

## Database Schema

The Prisma schema (`prisma/schema.prisma`) defines a comprehensive career profile system with 18 profile sections:

- **User & Auth**: User, roles, status, email verification
- **Profile Sections**: BasicInfo, PhotoHeadline, Address, Education, Experience, Skills, Certifications, Projects, CareerSummary, PreferredRoles, PreferredLocations, SalaryExpectation, Availability, Languages, SocialLinks, Resume, References, PrivacyConsent
- **Master Data**: Skill (with categories)
- **Stubs**: Company, JobPosting, Assessment (for future milestones)

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
```

### 6. Start Server

```bash
npm start
# or
node server.js
```

Server runs on `http://localhost:5000` with health check at `/health`.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/v1/auth/register` | User registration |
| POST | `/api/v1/auth/login` | User login |
| GET | `/api/v1/profile` | Get current user profile |
| PUT | `/api/v1/profile` | Update profile |
| GET | `/api/v1/profile/list` | List profiles (with filters) |
| POST | `/api/v1/resume/upload` | Upload resume |
| GET | `/api/v1/resume` | Get resume |

## Work Done (Milestone 1)

### ✅ Project Initialization
- Initialized Node.js project with Express 5
- Configured ESLint, Prettier, and TypeScript-ready structure

### ✅ Environment & Configuration
- Created `.env.example` with all required variables
- Built `config/env.js` with strict validation (required vars, JWT_SECRET length, NODE_ENV enum)
- Environment loads before any other module in `server.js`

### ✅ Database Layer (Prisma 7)
- Designed comprehensive schema with 18 profile section models
- Configured Prisma 7 with driver adapter (`@prisma/adapter-pg`)
- Removed legacy `url` from datasource (Prisma 7 requirement)
- Generated Prisma Client to `node_modules/@prisma/client`

### ✅ Authentication System
- JWT-based auth with bcrypt password hashing
- Register/Login endpoints with validation
- Token verification middleware
- Role-based access control (CANDIDATE/ADMIN)

### ✅ Profile Management
- CRUD operations for all 18 profile sections
- Nested profile structure with cascade deletes
- Input validation via express-validator
- Encryption for sensitive fields (phone, contactInfo)

### ✅ Resume Handling
- Multer-based file upload with validation
- File integrity checks (SHA-256)
- Secure storage outside public directory
- Resume metadata tracking

### ✅ Security & Middleware
- Helmet for HTTP headers
- CORS with credentials support
- Rate limiting (global + auth-specific)
- Centralized error handling
- Request size limits

### ✅ Developer Experience
- Health check endpoint
- Structured logging in development
- Graceful shutdown handlers
- Prisma Studio support (`npm run prisma:studio`)

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

## Notes

- **Prisma 7** requires driver adapter — configured via `@prisma/adapter-pg` in `config/prisma.js`
- No `prisma.config.ts` needed when using adapter directly in code
- Sensitive data encrypted at application layer before storage
- Profile sections use cascade delete with Profile as aggregate root
- Rate limiter trusts proxy (`app.set('trust proxy', 1)`) for deployment behind reverse proxies