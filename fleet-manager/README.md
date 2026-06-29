# Vehicle Fleet Manager

A self-hostable, installable mobile web app (PWA) for managing a company
vehicle fleet — registration, insurance, roadworthiness, maintenance, repairs,
fuel, reminders and depreciation.

This project is built in numbered phases. **Current status: Phase 1 complete.**

---

## Phase 1 — Foundations (done)

Phase 1 builds the secure backend foundation everything else sits on:

- Project structure under `backend/`.
- Database layer using **Knex**, so the same code runs on **SQLite** locally
  (no setup) and **PostgreSQL** in production. Switch with one env var.
- **Migrations** that create the full database schema (all tables).
- A **seed** that creates the first **Owner** account from your `.env`
  (the PIN is hashed immediately — never stored in plain text).
- **Login** with username + 6-digit PIN (bcrypt-hashed).
- **JWT** session tokens.
- **Role middleware** (Owner / Manager / Service Operator) enforced on the
  server, not just the UI.
- **Account lockout** after 5 failed attempts.

### What's NOT here yet

Vehicles, records, the history timeline, fuel→km logic, depreciation,
reminders, the `.ics` calendar, the React PWA frontend, and Docker deployment.
Those arrive in Phases 2–6.

---

## Run & test Phase 1

You need **Node.js 18+** (tested on Node 22). No database server is required —
local dev uses SQLite automatically.

```bash
cd fleet-manager/backend

# 1) Install dependencies
npm install

# 2) Create your environment file from the example, then edit it.
cp .env.example .env
#    - Set JWT_SECRET to a long random value:
#        node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
#    - Set OWNER_PIN to a 6+ digit PIN you'll remember (e.g. 246810).

# 3) Create the database tables and the owner account
npm run setup        # runs migrations, then the seed

# 4) Start the API
npm run dev          # or: npm start
```

You should see:

```
🚗 Fleet Manager API listening on http://localhost:4000 (db: sqlite, env: development)
```

### Try it out

Health check:

```bash
curl http://localhost:4000/health
```

Log in (use the username + PIN from your `.env`):

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"owner","pin":"246810"}'
```

You'll get back `{ "token": "...", "user": {...} }`. Use that token to call a
protected endpoint:

```bash
TOKEN=paste-the-token-here
curl http://localhost:4000/api/auth/me -H "Authorization: Bearer $TOKEN"
curl http://localhost:4000/api/admin/ping -H "Authorization: Bearer $TOKEN"
```

### Verify the security features

- **Wrong PIN** returns `Invalid username or PIN.` Try it 5 times and the
  account locks (HTTP 423) for `LOCKOUT_MINUTES`.
- **No/!invalid token** on `/api/auth/me` returns 401.
- **Role check**: `/api/admin/ping` allows owner/manager but returns 403 for a
  service_operator (you can create one in a later phase to confirm).

---

## Useful scripts (run inside `backend/`)

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the API with auto-reload |
| `npm start` | Start the API |
| `npm run migrate` | Apply database migrations |
| `npm run migrate:rollback` | Undo the last migration batch |
| `npm run seed` | Create the owner account (idempotent) |
| `npm run setup` | migrate + seed in one go |

## Switching to PostgreSQL

In `.env`, set `DB_CLIENT=postgres` and fill in the `PG*` variables, then run
`npm run setup` again. No code changes needed.
