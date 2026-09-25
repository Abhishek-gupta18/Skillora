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