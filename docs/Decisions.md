# Skillora Backend — Architectural Decisions

This document records significant technical decisions, their rationale, and context. Each entry is dated and immutable — new decisions append, old decisions are never edited (only superseded by new entries).

---

## 2026-09-25: Express 5 + express-validator Query Parameter Handling

**Decision:** Controllers reading validated query parameters MUST use `matchedData(req)` from `express-validator`, never `req.query` directly.

**Rationale:** Express 5 makes `req.query` a read-only getter that re-parses the URL on every access. express-validator sanitizers (`.toBoolean()`, `.trim()`) on `query()` chains cannot mutate it — sanitization silently no-ops.

**Impact:** First applied in `jobController.js:listOpenJobs`. All future endpoints with query sanitizers must follow this pattern.

**Reference:** `docs/constraint.md#5.5`, `validators/jobValidators.js`, `controllers/jobController.js`

---

## 2026-09-25: Job Status Filtering for Candidate-Facing Endpoints

**Decision:** All candidate-facing job queries hardcode `status: 'OPEN'` in the same Prisma query as the ID lookup. DRAFT and CLOSED jobs are never exposed.

**Rationale:** Prevents candidates from distinguishing "job doesn't exist" vs "job exists but isn't open" by probing IDs. Both cases return identical 404.

**Pattern:**
```js
prisma.jobPosting.findFirst({
  where: { id: req.params.id, status: 'OPEN' }
})
```

**Applied in:** `jobController.getOpenJob`, `jobController.listOpenJobs`, `eligibilityController.getJobEligibility`, `applicationController.applyToJob`

**Reference:** `controllers/jobController.js`, `controllers/eligibilityController.js`, `controllers/applicationController.js`

---

## 2026-09-25: Profile Attachment Scoped to Profile-Needed Routes

**Decision:** `attachProfile` middleware is applied ONLY to routes that require the candidate's profile. Browsing routes (job listings, job detail, eligibility list) do NOT have it.

**Rationale:** Avoids wasted JWT verification + DB profile lookups on public browsing endpoints. Also avoids the "multiple router mount" duplicate middleware bug.

**Implementation:**
- `jobRoutes.js`: `router.use(authenticate)` only; `/:id/eligibility` and `/:id/apply` add `attachProfile` per-route
- `profileRoutes.js`: `router.use(authenticate); router.use(attachProfile)` globally (all routes need profile)

**Reference:** `routes/jobRoutes.js`, `routes/profileRoutes.js`, `routes/eligibilityRoutes.js` (deleted)

---

## 2026-09-25: Single Combined Query for Ownership Checks

**Decision:** All ownership checks use a single `findFirst` combining resource ID + profileId, never a plain `findUnique(id)` followed by a manual check.

**Rationale:** Returns identical 404 whether the resource doesn't exist or belongs to another user — no information leakage.

**Pattern:**
```js
prisma.application.findFirst({
  where: { id: req.params.id, profileId: req.profile.id }
})
```

**Applied in:** `applicationController.withdrawApplication`, `profileListController` (all remove endpoints), `adminController.removeRequiredSkill`

---

## 2026-09-25: Controller → Service Layer Separation

**Decision:** Pure business logic goes in `services/*.js` (no Prisma, no req/res). Controllers fetch data, pass plain objects to services, return service results.

**Rationale:** Services are unit-testable in isolation. Controllers handle HTTP concerns only.

**Example:** `eligibilityService.calculateEligibility(candidateSkillClaims, jobRequiredSkills)` called from `eligibilityController.getJobEligibility` and `getJobMatches`.

**Reference:** `services/eligibilityService.js`, `controllers/eligibilityController.js`

---

## 2026-09-25: Application Status Defaults and Transitions

**Decision:** Application status is NEVER settable by the client.
- Create: defaults to `APPLIED` (schema default)
- Withdraw: forced to `WITHDRAWN` server-side
- Admin transitions (future): separate admin endpoints

**Rationale:** Prevents status manipulation. Terminal statuses (REJECTED, WITHDRAWN, HIRED) block further withdrawals.

**Reference:** `controllers/applicationController.js`, `prisma/schema.prisma` (ApplicationStatus enum)

---

## 2026-09-25: Duplicate Application Handling

**Decision:** Unique constraint on `[profileId, jobPostingId]` at DB level. Controller catches Prisma P2002 → 409 "You have already applied to this job".

**Rationale:** Race-condition-safe. DB constraint is the source of truth; application code handles the conflict gracefully.

**Reference:** `prisma/schema.prisma` (Application model), `controllers/applicationController.js:applyToJob`

---

## 2026-09-25: Skill Matching Uses Self-Rated Level (Temporary)

**Decision:** `eligibilityService.calculateEligibility` uses `SkillClaim.selfRatedLevel` as effective level. `verifiedScore` is ignored for now.

**Rationale:** Assessment Engine is deferred (see Assessment Engine decision below). Self-rated level is the only available signal.

**Future Work:** When Assessment Engine ships, prefer `verifiedScore` over `selfRatedLevel` when verified score exists.

**Reference:** `services/eligibilityService.js` (JSDoc note), `controllers/eligibilityController.js`

---

## 2026-09-25: Assessment Engine Deferred

**Decision:** Skill assessment (verifiedScore) is not implemented in Milestone 1. Schema includes `verifiedScore` field (nullable Float) and Assessment model stub for future.

**Rationale:** Core profile + job matching + applications are higher priority. Assessment requires separate infrastructure (test delivery, scoring, proctoring).

**Future Work:** When implemented, will add:
- Assessment service + routes
- Background job processing for scoring
- Webhook/callback for async results
- Update eligibilityService to prefer verifiedScore

**Reference:** `prisma/schema.prisma` (Assessment model, SkillClaim.verifiedScore), `services/eligibilityService.js` JSDoc

---

## 2026-09-25: No Pagination in MVP List Endpoints

**Decision:** List endpoints (`listOpenJobs`, `listJobPostings`, `listMyApplications`) return full arrays. Pagination noted as future improvement in comments.

**Rationale:** Current dataset small enough. Pagination adds complexity (cursors, total counts) not needed yet.

**Applied in:** `jobController.listOpenJobs`, `adminController.listJobPostings`, `applicationController.listMyApplications`

---

## 2026-09-25: Encryption for Sensitive Fields

**Decision:** Phone numbers and contact info encrypted at application layer (AES-256-GCM) before Prisma write. Prisma sees opaque string.

**Rationale:** Defense in depth — DB breach doesn't expose PII. Encryption handled in service/utils layer, not in Prisma middleware.

**Reference:** `utils/encryption.js`, `controllers/profileController.js` (phone, contactInfo handling), `prisma/schema.prisma` comments

---

## 2026-09-25: Prisma 7 Driver Adapter

**Decision:** Use `@prisma/adapter-pg` with manual client creation in `config/prisma.js`. No `prisma.config.ts`.

**Rationale:** Prisma 7 removed legacy datasource `url`. Driver adapter gives explicit control over connection pool and is required for serverless/edge.

**Reference:** `config/prisma.js`, `prisma/schema.prisma` (datasource block)

---

## 2026-09-25: Rate Limiter Trust Proxy

**Decision:** `app.set('trust proxy', 1)` enabled for correct client IP detection behind reverse proxies (Render, Railway, Nginx).

**Rationale:** Without this, rate limiter sees proxy IP instead of real client IP, causing false throttling.

**Reference:** `server.js:20`

---

## 2026-09-25: Environment Validation at Startup

**Decision:** `config/env.js` validates ALL required env vars before any other module loads. Missing vars → clear error + exit(1).

**Rationale:** Fail fast. Prevents cryptic runtime errors from undefined env vars.

**Reference:** `config/env.js`, `server.js:2-4`

---

## 2026-09-25: Admin Seeding Pattern

**Decision:** `prisma/seedAdmin.js` uses outer `.catch()/.then()` for disconnect/exit. Internal branches `return` (success) or `throw` (error) — no internal `process.exit()`.

**Rationale:** Uniform cleanup. Prisma disconnect happens exactly once via the promise chain, whether success or failure.

**Reference:** `prisma/seedAdmin.js`, `prisma/seed.js` (same pattern)