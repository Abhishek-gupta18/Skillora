# Skillora Backend — Request Flows

This document diagrams the request/response flow for each major feature.

---

## 1. Authentication Flow

```
POST /api/v1/auth/register
    │
    ▼
authRoutes.js
    │
    ├── registerValidation (express-validator)
    │       └── handleValidationErrors
    │
    ▼
authController.register
    │
    ├── Validate email uniqueness (Prisma)
    ├── Hash password (bcrypt)
    ├── Create User (role: CANDIDATE)
    ├── Create empty Profile (cascade)
    ├── Generate JWT
    │
    ▼
Response: 201 { success, data: { user, token } }
```

```
POST /api/v1/auth/login
    │
    ▼
loginValidation → handleValidationErrors
    │
    ▼
authController.login
    │
    ├── Find User by email
    ├── Verify password (bcrypt)
    ├── Generate JWT
    │
    ▼
Response: 200 { success, data: { user, token } }
```

---

## 2. Profile CRUD Flow (Example: Basic Info)

```
PATCH /api/v1/profile/me/basic-info
    │
    ▼
profileRoutes.js
    │
    ├── authenticate (JWT verify → req.user)
    ├── attachProfile (Prisma: Profile by userId → req.profile)
    ├── basicInfoValidation
    │       └── handleValidationErrors
    │
    ▼
profileController.upsertBasicInfo
    │
    ├── Prisma: Profile.upsert (BasicInfo)
    ├── Encrypt phone (AES-256-GCM)
    │
    ▼
Response: 200 { success, data: basicInfo }
```

**All 18 profile sections follow identical pattern:**
- Router: authenticate → attachProfile → validation → controller
- Controller: Prisma upsert → encrypt sensitive → respond

---

## 3. Job Browsing Flow (Candidate-Facing)

### List Open Jobs
```
GET /api/v1/jobs?search=&employmentType=...
    │
    ▼
jobRoutes.js
    │
    ├── authenticate
    ├── listJobsValidation (query validators)
    │       └── handleValidationErrors
    │
    ▼
jobController.listOpenJobs
    │
    ├── matchedData(req) → { search, employmentType, ... }
    ├── Build WHERE: { AND: [{ status: 'OPEN' }, ...filters] }
    ├── Prisma: JobPosting.findMany(where, include: company + skills)
    ├── Order by postedAt desc
    │
    ▼
Response: 200 { success, data: JobPosting[] }
```

### Get Single Job
```
GET /api/v1/jobs/:id
    │
    ▼
jobController.getOpenJob
    │
    ├── Prisma: JobPosting.findFirst({ where: { id, status: 'OPEN' }, include: ... })
    ├── If null → 404
    │
    ▼
Response: 200 { success, data: JobPosting }
```

---

## 4. Eligibility / Matching Flow

### Single Job Eligibility
```
GET /api/v1/jobs/:id/eligibility
    │
    ▼
jobRoutes.js
    │
    ├── authenticate
    ├── attachProfile (scoped to this route only)
    │
    ▼
eligibilityController.getJobEligibility
    │
    ├── Prisma: JobPosting.findFirst({ where: { id, status: 'OPEN' }, include: jobRequiredSkills + skill })
    ├── If null → 404
    ├── Prisma: SkillClaim.findMany({ where: { profileId }, select: skillId, selfRatedLevel, verifiedScore })
    ├── Service: calculateEligibility(candidateClaims, jobRequirements)
    │       ├── Map claims by skillId
    │       ├── For each requirement: effectiveLevel = claim?.selfRatedLevel
    │       ├── matched = effectiveLevel >= minimumLevel
    │       ├── Split mustHave / niceToHave
    │       ├── eligibilityScore = % of mustHave matched
    │       ├── isEligible = all mustHave matched
    │       └── Return { eligibilityScore, isEligible, matchedSkills, missingSkills }
    │
    ▼
Response: 200 { success, data: { job: {id,title,company}, eligibilityScore, isEligible, matchedSkills, missingSkills } }
```

### All Job Matches (Ranked)
```
GET /api/v1/profile/me/job-matches
    │
    ▼
profileRoutes.js (already has authenticate + attachProfile)
    │
    ▼
eligibilityController.getJobMatches
    │
    ├── Prisma: JobPosting.findMany({ where: { status: 'OPEN' }, include: company + jobRequiredSkills })
    ├── Prisma: SkillClaim.findMany({ where: { profileId } })
    ├── For each job: calculateEligibility(claims, job.requirements)
    ├── Map to { jobId, title, companyName, eligibilityScore, isEligible }
    ├── Sort by eligibilityScore DESC
    │
    ▼
Response: 200 { success, data: MatchResult[] }
```

---

## 5. Job Application Flow

### Apply to Job
```
POST /api/v1/jobs/:id/apply
    │
    ▼
jobRoutes.js
    │
    ├── authenticate
    ├── attachProfile (scoped)
    ├── applyToJobValidation (coverNote)
    │       └── handleValidationErrors
    │
    ▼
applicationController.applyToJob
    │
    ├── Prisma: JobPosting.findFirst({ where: { id, status: 'OPEN' } })
    ├── If null → 404
    ├── Prisma: Application.create({ profileId, jobPostingId, coverNote })
    │       └── Catch P2002 → 409 "Already applied"
    │
    ▼
Response: 201 { success, data: Application }
```

### List My Applications
```
GET /api/v1/profile/me/applications
    │
    ▼
profileRoutes.js (authenticate + attachProfile)
    │
    ▼
applicationController.listMyApplications
    │
    ├── Prisma: Application.findMany({ where: { profileId }, include: jobPosting + company, orderBy: appliedAt desc })
    ├── Shape: { id, jobId, jobTitle, companyName, status, coverNote, appliedAt, statusUpdatedAt }
    │
    ▼
Response: 200 { success, data: ApplicationSummary[] }
```

### Withdraw Application
```
PATCH /api/v1/profile/me/applications/:id/withdraw
    │
    ▼
profileRoutes.js (authenticate + attachProfile)
    │
    ▼
applicationController.withdrawApplication
    │
    ├── Prisma: Application.findFirst({ where: { id, profileId } })
    ├── If null → 404 (identical for not-found / not-owner)
    ├── If status in [REJECTED, WITHDRAWN, HIRED] → 409 "Cannot withdraw..."
    ├── Prisma: Application.update({ where: { id }, data: { status: 'WITHDRAWN', statusUpdatedAt: now() } })
    │
    ▼
Response: 200 { success, data: updatedApplication }
```

---

## 6. Admin Job Management Flow

```
POST   /api/v1/admin/jobs              → createJobPosting (companyId verified, status=DRAFT)
GET    /api/v1/admin/jobs              → listJobPostings (all statuses)
GET    /api/v1/admin/jobs/:id          → getJobPosting
PATCH  /api/v1/admin/jobs/:id          → updateJobPosting (whitelist, salary merge+validate)
PATCH  /api/v1/admin/jobs/:id/status   → updateJobStatus (DRAFT→OPEN sets postedAt)
DELETE /api/v1/admin/jobs/:id          → deleteJobPosting (FK catch P2003 → 409)
POST   /api/v1/admin/jobs/:jobId/required-skills  → addRequiredSkill (skillId verified, P2002 → 409)
DELETE /api/v1/admin/jobs/:jobId/required-skills/:skillReqId → removeRequiredSkill (ownership check)
```

**Key Admin Patterns:**
- All routes: authenticate → requireRole(['ADMIN'])
- Company verified on create/update
- Status transitions controlled server-side (postedAt set on DRAFT→OPEN)
- Whitelist-only updates (no status, no timestamps)
- FK errors caught and mapped to 409

---

## 7. Resume Upload Flow

```
POST /api/v1/resume/upload
    │
    ▼
resumeRoutes.js
    │
    ├── authenticate
    ├── attachProfile
    ├── multer (memory storage, 5MB limit, PDF only)
    │
    ▼
resumeController.uploadResume
    │
    ├── Validate file (mimetype, size)
    ├── SHA-256 hash
    ├── Encrypt + store file (storage/resumes/{profileId}-{timestamp}.pdf.enc)
    ├── Prisma: Resume.upsert({ fileUrl, fileHash, uploadedAt })
    │
    ▼
Response: 200 { success, data: { fileUrl, fileHash, uploadedAt } }
```

---

## 8. Error Handling Flow

```
Any async handler throws / rejects
    │
    ▼
asyncHandler wrapper (middleware/errorHandler.js)
    │
    ▼
next(err)
    │
    ▼
errorHandler middleware
    │
    ├── Log error + stack
    ├── If production → { success: false, message: 'Something went wrong' }
    ├── If development → { success: false, message: err.message }
    │
    ▼
Response: statusCode (err.statusCode || 500)
```

**Prisma-Specific Error Handling:**
- P2002 (unique constraint) → 409 with friendly message
- P2003 (FK violation) → 409 "Remove related records first"
- Other → 500

---

## 9. Middleware Chain Summary

| Route Pattern | Middleware Chain |
|---------------|------------------|
| `/api/v1/auth/*` | validation only |
| `/api/v1/jobs` (GET) | authenticate → validation |
| `/api/v1/jobs/:id` (GET) | authenticate |
| `/api/v1/jobs/:id/eligibility` | authenticate → attachProfile |
| `/api/v1/jobs/:id/apply` | authenticate → attachProfile → validation |
| `/api/v1/profile/*` | authenticate → attachProfile → validation |
| `/api/v1/admin/*` | authenticate → requireRole(['ADMIN']) → validation |