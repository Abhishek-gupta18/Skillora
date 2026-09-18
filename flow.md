# flow.md — Skillora Backend Execution Flow

This documents how a request actually travels through the system, in
what order things run, and what the server does from cold start to
handling a request. Read this before adding a new route or
middleware — inserting something in the wrong position can silently
disable a security control.

---

## 1. Server Startup Sequence (`server.js`, top to bottom)

```
1.  require('dotenv').config()
       → loads .env into process.env
2.  validateEnv()  [config/env.js]
       → checks DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY, PORT,
         FRONTEND_ORIGIN, NODE_ENV all exist
       → checks JWT_SECRET length >= 32, NODE_ENV is a valid value
       → THROWS AND CRASHES THE PROCESS if anything is missing/invalid
         (intentional — fail fast, never start in a broken state)
3.  Loading utils/encryption.js (via any controller that requires it)
       → ALSO validates ENCRYPTION_KEY is present and exactly 32 bytes
         at module-load time, throws if not
4.  const app = express()
5.  app.set('trust proxy', 1)
       → so express-rate-limit sees the real client IP when deployed
         behind Render/Railway/Nginx, not the proxy's IP
6.  app.use(helmet())
       → security headers, applied before anything else touches the
         request
7.  app.use(cors({ origin: process.env.FRONTEND_ORIGIN, credentials: true }))
       → single explicit origin, never a wildcard
8.  app.use(globalLimiter)
       → 300 requests / 15 min per IP, applies to EVERY route below
9.  app.use(express.json({ limit: '10kb' }))
       → JSON body parsing, capped at 10kb (does NOT apply to the
         multipart resume upload route — multer parses that
         separately, see section 5 below)
10. GET /health
       → liveness check, no DB call, no auth required
11. Route mounts (see section 2 below)
12. app.use(notFoundHandler)
       → catches any request that matched no route above
13. app.use(errorHandler)
       → MUST be the last app.use() — Express only treats a 4-arg
         function as error middleware when it's registered last
14. app.listen(PORT, ...)
15. process.on('unhandledRejection'/'uncaughtException', ...)
       → logs and process.exit(1) — the process does not keep running
         in a corrupted state
```

---

## 2. Route Mount Order (`server.js`)

```
/api/v1/auth      → routes/authRoutes.js
/api/v1/profile   → routes/profileRoutes.js       (18 singular + list sections' /me endpoint, and the 7 singular-section PATCH endpoints)
/api/v1/profile   → routes/profileListRoutes.js   (mounted at the SAME prefix — the 10 list-based sections live at /api/v1/profile/education, /skills, etc.)
/api/v1/resume    → routes/resumeRoutes.js
```

`profileRoutes.js` and `profileListRoutes.js` intentionally share the
`/api/v1/profile` prefix — this is not a mistake, it's how the 7
singular sections (`/me`, `/me/address`, etc.) and the 10 list
sections (`/education`, `/skills`, etc.) both live under one logical
"profile" namespace without one giant route file.

---

## 3. Request Flow: Registration (`POST /api/v1/auth/register`)

```
Request
  → authLimiter                  (10 req / 15 min per IP)
  → registerValidation            (express-validator chain: email,
                                    password, name, phone, dob, gender)
  → handleValidationErrors        (422 with field errors if invalid)
  → register() controller:
       1. findUnique by email — if exists, generic 409 (no
          "email already exists" — enumeration protection)
       2. hashPassword() (bcrypt, 12 rounds)
       3. encrypt(phone) (AES-256-GCM)
       4. prisma.$transaction:
            - create User
            - create Profile
            - create BasicInfo (with encrypted phone)
            - create PrivacyConsent (defaults: PRIVATE, false, null)
          → P2002 inside the transaction (race condition) also
            returns the same generic 409
       5. jwt.sign({ id, type: 'candidate' }, ..., { expiresIn: '1h' })
       6. respond 201 { token, user: { id, email, role } }
          — passwordHash and encrypted phone NEVER appear in the response
```

---

## 4. Request Flow: Authenticated Profile Request (example: `PATCH /api/v1/profile/me/address`)

```
Request (Authorization: Bearer <token>)
  → authenticate middleware       [middleware/authMiddleware.js]
       - reads Bearer token, jwt.verify() with { algorithms: ['HS256'] }
       - sets req.user = { id, type } from the token payload
       - 401 if missing/invalid/expired — does not reveal which
  → attachProfile middleware      [middleware/profileMiddleware.js]
       - prisma.profile.findUnique({ where: { userId: req.user.id } })
       - sets req.profile = { id, userId, createdAt, updatedAt }
       - 404 if no profile exists for this user
  → addressValidation              (field-level checks, all optional
                                     — this is a PATCH)
  → handleValidationErrors
  → upsertAddress() controller:
       1. findUnique({ profileId: req.profile.id }) — does this
          section already exist for this profile?
       2. if NOT existing: verify all schema-required fields are
          present in the request body, else 422 listing what's missing
       3. upsert keyed on profileId (NEVER on any id from the request)
       4. respond 200 with the upserted row
```

`req.profile.id` is the ONLY source of truth for "whose data is
this" throughout this entire flow — it is never taken from
`req.body` or `req.params`.

---

## 5. Request Flow: List-Section Update (example: `PATCH /api/v1/profile/education/:id`)

```
Request
  → authenticate
  → attachProfile
  → idParamValidation              (is :id a plausible string?)
  → handleValidationErrors
  → updateEducationValidation       (all fields optional — PATCH)
  → handleValidationErrors
  → updateEducation() controller:
       1. findFirst({ where: { id: req.params.id,
                                profileId: req.profile.id } })
          — BOTH conditions in the SAME query
       2. if nothing found → 404 "Not found" (deliberately identical
          whether the id doesn't exist at all, or belongs to another
          candidate — never distinguish these two cases)
       3. only if found: prisma.educationEntry.update({ where: { id } })
       4. respond 200 with the updated row
```

This exact ownership-check pattern (`findFirst` with both `id` AND
`profileId` in one query, before any update/delete) is repeated
identically across all 10 list-based sections
(`controllers/profileListController.js`). If a new list-section
endpoint is ever added, it MUST follow this same pattern — see
Constraints.md.

---

## 6. Request Flow: Resume Upload (`POST /api/v1/resume`)

```
Request (multipart/form-data, field name "resume")
  → authenticate
  → attachProfile
  → uploadResumeFile               (multer, memoryStorage, 5MB limit,
                                     field name must be "resume")
       - fileFilter does a CHEAP first-pass check (mimetype ==
         'application/pdf' AND filename ends in .pdf) — this is
         spoofable and is NOT the real security gate
  → handleUploadError              (4-arg error middleware — catches
                                     multer's own errors: file-too-
                                     large → 413, filter-rejected →
                                     400, converts to standard JSON
                                     shape)
  → uploadResume() controller:
       1. if no req.file → 400
       2. isValidPdf(req.file.buffer) — REAL check: does the buffer
          start with the %PDF- magic bytes? If not → 400, nothing
          touches disk
       3. hashFileBuffer(buffer) → SHA-256 hex (fileIntegrity.js)
       4. findUnique({ profileId }) — is there an existing resume to
          replace?
       5. generate a random safe filename (never the client's
          original filename)
       6. fs.writeFileSync — write the NEW file to disk FIRST
       7. prisma.resume.upsert — record it in the DB SECOND
       8. only now, delete the OLD file from disk (if one existed)
       9. respond 201 { id, uploadedAt, fileHash } — the internal
          storage filename/path is never returned
```

Download (`GET /api/v1/resume`) and delete (`DELETE /api/v1/resume`)
follow the same `authenticate → attachProfile → findUnique({ profileId })`
pattern — ownership is automatic because the lookup key is always the
authenticated user's own `profileId`, never a client-supplied resume
id.

---

## 7. Where To Look When Debugging

| Symptom | Likely place to look |
|---|---|
| "Route not found" for a route you just added | Check it was actually mounted in `server.js`, and mounted BEFORE `notFoundHandler` |
| A new field isn't being saved | Check the validator has it, AND the controller's `data = {}` object includes an `if (field !== undefined)` line for it |
| 401 on every request even with a token | Check `JWT_SECRET` matches between when the token was issued and now (e.g. server restarted with a different `.env`) |
| A candidate can see/edit another candidate's data | STOP — this is the one class of bug treated as critical. Check the controller uses `req.profile.id`, not anything from `req.body`/`req.params`, and (for list sections) uses the combined `findFirst({ id, profileId })` pattern |
| 500 error with no detail in production | Check server logs (`console.error` in `errorHandler.js` always logs the full stack server-side, even though the client only gets a generic message in production) |
| Prisma CLI can't connect / hangs | Check `prisma.config.ts` has the right `DATABASE_URL`, and that it's the Session Pooler (5432) connection string, not Transaction Pooler (6543) |
