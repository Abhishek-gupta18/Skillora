## 5.5. Express 5 + express-validator Query Parameters

- **NEVER** read a sanitized query-parameter value directly from
  `req.query` in a controller. Express 5 made `req.query` a
  read-only getter (it re-parses the URL fresh on every access),
  so express-validator's sanitizers (`.toBoolean()`, `.trim()`,
  etc.) on `query()` validator chains CANNOT mutate it — the
  sanitization silently no-ops, and `req.query` still holds the
  raw, unsanitized string.
- **ALWAYS** use `matchedData(req)` (imported from
  `express-validator`) in any controller that reads validated query
  parameters, instead of destructuring from `req.query` directly.
  `matchedData(req)` returns the actual validated AND sanitized
  values.
- This does NOT affect `req.body` (still a normal mutable object in
  Express 5) or `req.params` — only `req.query` is affected. Body
  and param validators can continue reading `req.body`/`req.params`
  directly as the codebase already does elsewhere.
- If a new endpoint ever validates query parameters with a
  sanitizer, this pattern must be followed — this is a project-wide
  rule, not a one-off fix (first discovered in `jobController.js`'s
  `listOpenJobs`, where an unfixed version would have silently
  passed a raw string instead of a boolean to a Prisma `Boolean`
  filter).

---

## 5.6. Interview Experience — Author Identity and Content Preservation Constraints

- **authorProfileId is NEVER accepted from the client on create** — always `req.profile.id` from the attached profile middleware. The create endpoint requires `attachProfile` middleware.
- **List and single-item GET responses NEVER include author-identifying information** (name, email, profile link, profile relation) — this applies unconditionally, not just when `isAnonymous === true`. The board's framing (like GFG/LeetCode Discuss) is about the interview content, not the author.
- **Delete-own must use combined `{id, authorProfileId}` ownership query** — identical 404 whether the resource doesn't exist or belongs to another user. Same pattern as every list-section delete already in this codebase (`applicationController.withdrawApplication`, `profileListController` remove endpoints, `adminController.removeRequiredSkill`).
- **companyId and jobPostingId relations use `onDelete: SetNull`** (NOT Restrict, NOT Cascade) — if an admin later deletes a Company or JobPosting, the interview experience post SURVIVES (it's a candidate's own content/history) but simply loses its link to the deleted record, falling back to just the free-text `companyName`/`roleTitle`. This is different from how `JobRequiredSkill`/`Application` relate to `JobPosting` (those use `Restrict` to protect operational referential integrity).
- **matchedData(req) MUST be used for query-parameter filtering** in `listInterviewExperiences`, per the Express-5 `req.query` issue documented in section 5.5. The validator uses `query()` chains with sanitizers; controllers must read via `matchedData(req)`.
- **No upvote/helpful-count system** — out of scope for this version.
- **No content-moderation/profanity filter beyond admin manual-delete** — the admin delete endpoint in `adminInterviewExperienceController.js` is the only moderation tool in this version.