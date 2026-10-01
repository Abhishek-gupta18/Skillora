# Skillora Frontend

Frontend-only React (Vite) SPA for **Skillora** — the AI-powered career & skill
intelligence platform. It talks to the **existing** Skillora backend REST API;
there is no backend, database, or server-side code in this folder.

## Run

```bash
cd Frontend
npm install
npm run dev
```

Build for production: `npm run build`, preview the build: `npm run preview`.

## Configuration

Copy `.env.example` to `.env` (already created with defaults):

```
VITE_API_BASE_URL=http://localhost:5000
```

The client appends `/api/v1` to this base URL automatically.

## Auth model

- JWT is stored in `localStorage` (key `skillora_token`) and sent as
  `Authorization: Bearer <token>` on every request.
- Tokens expire after 1 hour and there is no refresh token — on any 401 the
  token is cleared and the user is redirected to `/login` with a
  "Session expired" message.
- `data.user.role` from login/register routes to either the Candidate app
  (`/dashboard`, `/profile`, `/jobs`, `/job-matches`, `/applications`) or the
  separate Admin app (`/admin/companies`, `/admin/jobs`, …).

## Known backend dependency

`GET /api/v1/skills` (master skill list) is **not implemented on the backend
yet**. The UI for skill pickers (Skills section, admin job Required Skills)
is built assuming it returns:

```json
{ "success": true, "data": [{ "id": "...", "name": "...", "category": "..." }] }
```

Until that endpoint exists, those dropdowns show an explanatory message.
