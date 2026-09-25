# Skillora Backend Architecture

## Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      HTTP Layer                              │
│  server.js → routes/*.js (Express routers)                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Middleware Layer                           │
│  authenticate → attachProfile → validation chains           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Controller Layer                           │
│  controllers/*.js (asyncHandler wrapped)                    │
│  - HTTP concerns only: req/res/next, status codes, JSON     │
│  - Data fetching via Prisma                                 │
│  - Delegates pure logic to Service layer                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                              │
│  services/*.js (pure functions)                              │
│  - NO Prisma import, NO req/res                             │
│  - Receives plain data, returns plain data                  │
│  - Unit-testable in isolation                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Data Layer                                 │
│  Prisma Client → PostgreSQL                                  │
└─────────────────────────────────────────────────────────────┘
```

## Key Principles

### 1. Controller → Service Separation
- **Controllers** handle all I/O: Prisma queries, request/response, error handling
- **Services** contain pure business logic: calculations, transformations, rules
- Controllers call services with data already fetched from DB
- Services never import Prisma or touch HTTP objects

### 2. Router Organization
- Each feature domain has its own router file in `routes/`
- Routers compose middleware chains explicitly (no hidden global middleware)
- `authenticate` applied first, then `attachProfile` where needed
- Validation middleware (`handleValidationErrors`) runs after validators

### 3. Profile Attachment Pattern
- `attachProfile` middleware fetches Profile by `req.user.id`
- Applied **only** to routes that need the candidate's profile
- Browsing routes (job listings, job detail) do NOT need attachProfile
- Profile-scoped routes (my applications, my matches) DO need it

### 4. Job Status Filtering (Candidate-Facing)
- All candidate-facing job queries **hardcode** `status: 'OPEN'`
- Uses combined `{id, status: 'OPEN'}` in `findFirst`/`findMany`
- Never exposes DRAFT/CLOSED jobs via different error behavior
- Admin routes see all statuses; candidate routes see only OPEN

### 5. Express 5 + express-validator Query Params
- `req.query` is a read-only getter in Express 5
- Sanitizers (`.toBoolean()`, `.trim()`) on `query()` chains **do not mutate** `req.query`
- **Always** use `matchedData(req)` in controllers for validated query params
- Does NOT affect `req.body` or `req.params`

### 6. Ownership Checks
- Single combined query: `findFirst({ where: { id, profileId } })`
- Identical 404 whether resource doesn't exist or belongs to another user
- Used consistently across all list-section controllers

### 7. Validation Layer
- Validators in `validators/` export arrays of express-validator chains
- All validators end with `handleValidationErrors` middleware
- Body validators for mutations, query validators for GET filters
- Cross-field validation in controller (merging with existing data)

### 8. Error Handling
- `asyncHandler` wrapper catches promise rejections → `next(err)`
- Centralized `errorHandler` middleware formats responses
- Dev mode: full error + stack; Prod: generic message
- Prisma error codes (P2002, P2003) handled explicitly where needed

## Module Boundaries

| Layer | Can Import | Cannot Import |
|-------|------------|---------------|
| Routes | controllers, middleware, validators | Prisma, services |
| Controllers | Prisma, services, middleware/errorHandler | routes |
| Services | (pure JS only — no external deps except utils) | Prisma, req/res, routes, controllers |
| Middleware | Prisma (for attachProfile) | controllers, services |

## Current Feature Domains

| Domain | Router | Controllers | Services | Validators |
|--------|--------|-------------|----------|------------|
| Auth | authRoutes.js | authController.js | — | authValidators.js |
| Profile CRUD | profileRoutes.js | profileController.js | — | profileValidators.js |
| Profile Lists | profileListRoutes.js | profileListController.js | — | profileListValidators.js |
| Resume | resumeRoutes.js | resumeController.js | — | — |
| Job Browsing | jobRoutes.js | jobController.js | — | jobValidators.js |
| Eligibility | jobRoutes.js + profileRoutes.js | eligibilityController.js | eligibilityService.js | jobValidators.js |
| Applications | jobRoutes.js + profileRoutes.js | applicationController.js | — | applicationValidators.js |
| Admin | adminRoutes.js | adminController.js | — | adminValidators.js |

## Future Extensibility
- Assessment Engine: will add AssessmentService + assessment routes
- Admin application management: will add admin-side ApplicationController
- Notifications: will add notification service + webhook handlers