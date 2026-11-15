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

## 2026-09-25: Skill Matching Uses Self-Rated Level (Temporary) — SUPERSEDED

**Decision:** `eligibilityService.calculateEligibility` uses `SkillClaim.selfRatedLevel` as effective level. `verifiedScore` is ignored for now.

**Rationale:** Assessment Engine is deferred (see Assessment Engine decision below). Self-rated level is the only available signal.

**Future Work:** When Assessment Engine ships, prefer `verifiedScore` over `selfRatedLevel` when verified score exists.

**SUPERSEDED by:** 2026-11-09: Verified-Only Eligibility — see below.

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

---

## 2026-10-02: Interview Experience Feature — User-Generated Content with Optional Platform Links

**Decision:** InterviewExperience model links to Company and JobPosting via optional `companyId` and `jobPostingId` fields with `onDelete: SetNull`. Free-text `companyName` and `roleTitle` are always required.

**Rationale:** Candidates share experiences from companies/roles that may not exist on the platform. If an admin later deletes a Company or JobPosting, the interview experience post must survive (it's the candidate's own content/history) but lose its link to the deleted record, falling back to just the free-text fields. This differs from JobRequiredSkill/Application which use `onDelete: Restrict` to protect referential integrity of operational records.

**Pattern:**
```prisma
companyId  String?  // optional link
company    Company? @relation(fields: [companyId], references: [id], onDelete: SetNull)
// SetNull: post survives Company deletion; user-generated content preserved vs. JobRequiredSkill uses Restrict to protect operational referential integrity
```

**Applied in:** `prisma/schema.prisma` (InterviewExperience model), `controllers/interviewExperienceController.js` (create verifies existence if provided but doesn't require it)

**Reference:** `controllers/interviewExperienceController.js:createInterviewExperience`, `prisma/schema.prisma`

---

## 2026-10-02: Interview Experience Board — Author Identity Never Exposed in List/View

**Decision:** Both list (`listInterviewExperiences`) and single-item (`getInterviewExperience`) endpoints NEVER include author-identifying information (name, email, profile link) in responses, regardless of `isAnonymous` flag. This is stronger than just respecting `isAnonymous` — it applies unconditionally to keep the board's framing consistent with GFG/LeetCode Discuss where authorship isn't the point.

**Rationale:** Interview experience boards are about the content (company, role, rounds, questions, outcome), not the author. Exposing author identity changes the social dynamics and discourages candid sharing.

**Pattern:**
```js
// List endpoint
const experiences = await prisma.interviewExperience.findMany({
  where,
  include: { rounds: true },  // NO profile include
  orderBy: { createdAt: 'desc' },
});

// Single-item endpoint
const experience = await prisma.interviewExperience.findUnique({
  where: { id: req.params.id },
  include: { rounds: true },  // NO profile include
});
```

**Applied in:** `controllers/interviewExperienceController.js` (listInterviewExperiences, getInterviewExperience)

**Reference:** `controllers/interviewExperienceController.js`

---

## 2026-10-02: Interview Experience Create — Nested Write for Rounds

**Decision:** `createInterviewExperience` uses Prisma's nested write to create the InterviewExperience and its InterviewRound children in a single transaction.

**Rationale:** Atomic creation ensures rounds are never orphaned. Controller maps `req.body.rounds` directly to Prisma's `create` nested write.

**Pattern:**
```js
await prisma.interviewExperience.create({
  data: {
    authorProfileId: req.profile.id,
    // ...otherFields,
    rounds: {
      create: req.body.rounds.map(r => ({
        roundOrder: r.roundOrder,
        roundType: r.roundType,
        questionsAsked: r.questionsAsked,
        notes: r.notes || null,
      })),
    },
  },
  include: { rounds: true },
});
```

**Applied in:** `controllers/interviewExperienceController.js:createInterviewExperience`

**Reference:** `controllers/interviewExperienceController.js`

---

## 2026-10-02: Interview Experience Delete-Own — Combined Ownership Query

**Decision:** `deleteOwnInterviewExperience` uses `findFirst({ where: { id, authorProfileId } })` for ownership check — identical 404 whether missing or belongs to another user.

**Rationale:** Consistent with established pattern across all list-section controllers (applications, profile lists, admin required skills). No information leakage about existence of others' content.

**Applied in:** `controllers/interviewExperienceController.js:deleteOwnInterviewExperience`

**Reference:** `controllers/interviewExperienceController.js`, `docs/Decisions.md#2026-09-25: Single Combined Query for Ownership Checks`

---

## 2026-11-02: Roadmap + Assessment Response Shape Normalized to `data`

**Decision:** The remaining top-level roadmap/assessment response fields now sit under a `data` key, matching the API-wide `{ success, data }` contract. This covers the success bodies plus the two identifier-carrying 409s.

**Rationale:** The Proventa frontend integration contract (27 Oct 2026) standardizes on `{ success, data }` and listed these as the known exceptions. The frontend adapter reads `body.data ?? body`, so this change is backwards-compatible — the same client works before and after.

**Changed responses:**
- `POST /profile/me/roadmaps` — 201 create and 200 reactivated; 409 (already-active) carries `data: { assignmentId }`
- `GET /profile/me/roadmaps/:assignmentId` — 200
- `PATCH .../roadmaps/:assignmentId/steps/:stepId` — 200
- `PATCH .../roadmaps/:assignmentId/abandon` — 200
- `POST /assessments/start` — 409 (in-progress) carries `data: { sessionId }`

`GET /profile/me/roadmaps` (list) was already wrapped in `data` and is unchanged.

**Reference:** `controllers/roadmapController.js`, `controllers/assessmentController.js`

---

## 2026-11-09: Assessment Integrity — Session-Bound Questions, Fair Scoring, Answer Position Balance

**Decision:** Assessment sessions now bind sampled questions at start time via a new `AssessmentSessionQuestion` join table. Scoring uses the bound question count as denominator (unanswered = wrong). Answers are editable until completion. Correct option positions are balanced at seed time.

**Rationale:**
- Fixes the ability to answer any bank question for a session (previously only `skillId` was checked).
- Fixes score inflation from answering few easy questions (denominator was `answered`, now `bound`).
- Prevents session creation with 0 questions when bank is short (returns 422).
- Makes completion atomic (updateMany with status/expiry guard → 409 on double-complete).
- Eliminates correct-option-index skew in the question bank (index 3 was never correct; index 1 dominated).

**Changes:**
- New model `AssessmentSessionQuestion` with `(sessionId, questionId)` and `(sessionId, position)` unique constraints; cascade delete from session.
- `startSession`: samples `ASSESSMENT_QUESTION_COUNT` (10) questions via `$queryRaw`; creates session + `AssessmentSessionQuestion` rows in one transaction; returns `position` per question; 422 if fewer than 10 available.
- `getSessionQuestions`: returns `{ sessionId, expiresAt, questions: [{id, promptText, options, difficulty, position}], answers: [{questionId, selectedOptionIndex}] }` — no `correctOptionIndex`/`isCorrect`.
- `submitAnswer`: validates `(sessionId, questionId)` exists in `AssessmentSessionQuestion` (422 otherwise); rejects out-of-bounds `selectedOptionIndex`; upsert retained with comment explaining safety.
- `completeSession`: score = `correct / totalBoundQuestions * 100`; atomic `updateMany` with `where: { id, profileId, status: 'IN_PROGRESS', expiresAt: { gt: now } }`; 409 if count !== 1; keeps verifiedScore rules (only on pass, never reset, silent catch preserved).
- New pure module `utils/questionBalance.js`: deterministic seeded PRNG; spreads correct indices evenly (15×4 → 4/4/4/3); preserves option text; pins questions referencing other options by position/letter ("all of the above", etc.).
- `seedQuestions.js`: applies balance per file before insert; logs distribution; exits 1 if any index >40% of non-pinned.
- `package.json`: added `test` (node --test) and `questions:check` (no DB) scripts.
- Tests: `tests/questionBalance.test.js` covers text preservation, evenness on real files, seed determinism, pinned questions untouched.

**Reference:** `prisma/schema.prisma` (AssessmentSessionQuestion), `controllers/assessmentController.js`, `utils/skillLevelBands.js` (ASSESSMENT_QUESTION_COUNT), `utils/questionBalance.js`, `prisma/seedQuestions.js`, `tests/questionBalance.test.js`, `package.json`

---

## 2026-11-09: Retake Gate — No Free Retakes, Approval Required

**Decision:** Candidates may retake an assessment for a given (skillId, targetLevel) ONLY if they have an APPROVED, unconsumed RetakeRequest. Retake requests are created by candidates for COMPLETED sessions they own, citing SYSTEM_FAILURE or OTHER_VALID_REASON with a reason (20–1000 chars) and optional evidenceNote (max 1000 chars). Admin reviews and approves/rejects. On APPROVE, the request is marked with reviewedByUserId and reviewedAt. When the candidate starts a new session for that level, the request is consumed atomically inside the same transaction. Level upgrades (targetLevel higher than any prior COMPLETED session for that skill) are allowed without a retake request.

**Rationale:**
- Product requirement: no free retakes; retakes only via approved claim of system failure or valid reason with proof.
- Prevents candidates from repeatedly retaking until they pass.
- Provides audit trail: every retake has a request with reason, evidence, admin decision, and consumption timestamp.
- Level upgrades are allowed because they represent genuine skill progression, not a retake of the same level.

**Changes:**
- New enums: `RetakeReasonType` { SYSTEM_FAILURE, OTHER_VALID_REASON }, `RetakeRequestStatus` { PENDING, APPROVED, REJECTED }.
- New model `RetakeRequest` with fields: profileId, skillId, sessionId (the disputed COMPLETED session), targetLevel, reasonType, reason, evidenceNote?, status, reviewedByUserId?, reviewNote?, reviewedAt?, consumedAt?, createdAt, updatedAt. Relations to Profile (Cascade), Skill (Restrict), AssessmentSession (Restrict). Indexes on [profileId, skillId] and [status].
- Candidate endpoints (under `/api/v1/assessments` with `authenticate` + `attachProfile`):
  - `POST /retake-requests` { sessionId, reasonType, reason, evidenceNote? } — validates session ownership, COMPLETED status, copies skillId/targetLevel from session; 409 if PENDING request exists for (profileId, skillId); rate limited (5/hr).
  - `GET /retake-requests` — lists caller's own requests.
- Admin endpoints (under `/api/v1/admin` with `authenticate` + `requireRole(['ADMIN'])`):
  - `GET /retake-requests?status=&page=&limit=` — paginated (max limit 50), uses `matchedData(req)`.
  - `PATCH /retake-requests/:id` { status: 'APPROVED'|'REJECTED', reviewNote? } — only from PENDING (else 409); stamps reviewedByUserId (req.user.id) and reviewedAt.
- Gate in `startSession`: after skill-claim check, before sampling. If any COMPLETED session exists for (profileId, skillId, targetLevel = selfRatedLevel), requires APPROVED unconsumed RetakeRequest. None → 403. If exists, consumes it atomically inside the session-creation transaction (updateMany where consumedAt is null and id matches; count must be 1 else 409).
- Pure helper `utils/retakeGate.js` exporting `isRetakeRequired(completedTargetLevels, targetLevel)` for testability.
- Tests: `tests/retakeGate.test.js` (6 tests).
- Validators in `validators/retakeRequestValidators.js` using express-validator with `matchedData`.
- Rate limiter `retakeRequestLimiter` (5 requests/hour) in `middleware/rateLimiters.js`.

**Reference:** `prisma/schema.prisma` (RetakeRequest), `controllers/assessmentController.js`, `controllers/adminController.js`, `routes/assessmentRoutes.js`, `routes/adminRoutes.js`, `validators/retakeRequestValidators.js`, `middleware/rateLimiters.js`, `utils/retakeGate.js`, `tests/retakeGate.test.js`, `package.json`

---

## 2026-11-09: Verified-Only Eligibility — Only Verified Skills Count

**Decision:** Job eligibility now uses ONLY the candidate's `verifiedLevel` (from completed assessments). Self-rated level is ignored for eligibility. A skill is "matched" only when `verifiedLevel !== null && verifiedLevel >= minimumLevel`. The eligibility response now includes: `verifiedLevel`, `selfRatedLevel`, `gap`, and `status` ('verified-match' | 'below-level' | 'unverified' | 'not-claimed'). New `eligibilityLabel` field: 'eligible' (all required matched), 'partially-eligible' (score ≥ 50 but not eligible), 'skill-gap' (score < 50). `rankJobMatches` also returns `eligibilityLabel`. `SkillClaim` gains `verifiedLevel Int?` and `verifiedAt DateTime?`; backfilled from latest passed session. `completeSession` writes `verifiedLevel = session.targetLevel` and `verifiedAt = now()` on pass (never lowers existing `verifiedLevel`). Mass-assignment guard: validators and controllers only accept `skillId`/`selfRatedLevel`; `verifiedScore`, `verifiedLevel`, `verifiedAt` are never client-writable. Dashboard now returns per-claim `{ skillId, skillName, selfRatedLevel, verifiedLevel, state: 'claimed' | 'verified' }`.

**Rationale:**
- Owner decision: only VERIFIED skills count toward job eligibility. Self-rated level is aspirational, not evidence.
- Prevents candidates from claiming high levels without proof.
- `verifiedLevel` captures the level at which the candidate actually passed an assessment.
- `gap` quantifies how far below the requirement the candidate is.
- `state` makes it easy for UI to show "claimed" vs "verified" badges.
- Level upgrades (higher selfRatedLevel) don't affect eligibility until verified.

**Changes:**
- Schema: `SkillClaim` adds `verifiedLevel Int?`, `verifiedAt DateTime?`. Migration includes backfill from latest COMPLETED+PASSED `AssessmentSession`.
- `services/eligibilityService.js`: `calculateEligibility` now uses `verifiedLevel`; returns `gap`, `status`, `eligibilityLabel`. `rankJobMatches` returns `eligibilityLabel`.
- `controllers/eligibilityController.js`, `controllers/profileController.js`: selects now include `verifiedLevel`.
- `controllers/assessmentController.js`: `completeSession` writes `verifiedLevel`/`verifiedAt` on pass (keeps higher if new level is lower).
- `controllers/profileController.js`: `getDashboard` returns `skillClaims` array with `state`.
- Validators: `createSkillClaimValidation`/`updateSkillClaimValidation` only allow `skillId`/`selfRatedLevel`.
- Tests: `tests/eligibilityService.test.js` (21 tests).

**Reference:** `prisma/schema.prisma` (SkillClaim), `prisma/migrations/.../migration.sql` (backfill), `services/eligibilityService.js`, `controllers/eligibilityController.js`, `controllers/profileController.js`, `controllers/assessmentController.js`, `validators/profileListValidators.js`, `controllers/profileListController.js`, `tests/eligibilityService.test.js`

---

## 2026-11-15: Auth Hardening — Token Version Revocation, 7d JWT, Status Checks

**Decision:** Replace 1h JWT with configurable expiry (default 7d via `JWT_EXPIRES_IN`). Add `tokenVersion` (Int, default 0) to `User`. JWT payload includes `id` and `tv` (tokenVersion). `authenticate` middleware validates JWT, then loads `{ id, role, status, tokenVersion }` from DB in one query. Fails with 401 if user missing, `tokenVersion` mismatch, or status ≠ `ACTIVE` (403 for suspended). `requireRole` reuses `req.user.role` (no second DB query). New endpoints: `GET /auth/me` (user + profile summary + completion %), `POST /auth/change-password` (verify current, hash new, increment tokenVersion, return new token, rate limited), `POST /auth/logout-all` (increment tokenVersion). Login/register keep response shape; JWT includes `tv`; expiry from `JWT_EXPIRES_IN` (default `7d`). Remove misleading `type: 'candidate'` claim. `server.js` reads `TRUST_PROXY` env (`false`/`1`/`2`…). Docs: Constraints.md updated (authenticate MUST check status + tokenVersion; tokenVersion bumps on password change/logout-all/admin suspend). Tests: pure `evaluateAuthState` helper + smoke test for new routes.

**Rationale:**
- 1h expiry caused poor UX; 7d balances security/UX for launch.
- TokenVersion revocation is simpler than refresh tokens (no token store, no rotation logic, no client complexity).
- Single DB read per request (user + status + tv) keeps latency low while being authoritative.
- Status + tv check on every request closes the "suspended but token still works" and "password changed but old tokens work" gaps.
- No refresh token infrastructure to build/maintain pre-launch; revisit post-launch if needed.

**Reference:** `prisma/schema.prisma` (User.tokenVersion), `middleware/authMiddleware.js`, `middleware/roleMiddleware.js`, `controllers/authController.js`, `routes/authRoutes.js`, `utils/jwt.js`, `server.js`, `docs/Constraints.md`, `tests/auth.test.js` (if added), `tests/smoke.test.js`

---

## 2026-11-16: Admin Question Tooling — Immutability, Bulk All-or-Nothing, Coverage

**Decision:** Admin question endpoints enforce immutability once bound to sessions. `PATCH /admin/questions/:id` and `PATCH /admin/questions/:id/active` reject 409 if skillId, difficulty, promptText, options, or correctOptionIndex is changed on a question already bound to any AssessmentSessionQuestion. No DELETE route — deactivate via `isActive=false` instead. `POST /admin/questions/bulk` validates all 1-100 items first, then inserts in one transaction using `tx.question.createMany` (all-or-nothing, timeout 20s). `utils/questionBulk.js` pure helper validates, de-duplicates identical promptText within batch, applies `balanceCorrectPositions`, and asserts correct option TEXT unchanged per item. Distribution report uses `getDistribution` for real per-index counts. `GET /admin/questions/coverage` uses `prisma.question.groupBy` + pure `utils/coverage.js` assembly (includes zero-count rows for every active skill × EASY/MEDIUM/HARD). Admin skills: `GET /skills` public list filters `isActive: true`; admin `/admin/skills` returns all with `isActive` filter. Question sampling in `startSession` adds `AND "isActive" = true`. Update `updateQuestion` validates existing correctOptionIndex when options provided without new index. Validators use `.toInt()` for correctOptionIndex.

**Rationale:**
- Immutability on bound questions prevents silent answer-key changes after candidates have answered.
- Bulk all-or-nothing with createMany is faster than loop and atomic.
- Pure helpers enable unit tests without DB.
- Coverage endpoint uses single groupBy instead of N×M queries.
- Admin question list includes correctOptionIndex; public skill list filters isActive.

**Reference:** `prisma/schema.prisma` (Question.isActive, Skill.isActive), `controllers/adminController.js` (createQuestionsBulk, getQuestionsCoverage, updateQuestion, createQuestion, updateQuestionActive, listQuestions, listSkillsAdmin, updateSkill), `controllers/assessmentController.js` (startSession), `utils/questionBulk.js`, `utils/coverage.js`, `utils/questionBalance.js`, `validators/adminQuestionValidators.js`, `routes/adminRoutes.js`, `tests/questionBulk.test.js`, `tests/coverage.test.js`