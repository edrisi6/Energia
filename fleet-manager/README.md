# Vehicle Fleet Manager

A self-hostable, installable mobile web app (PWA) for managing a company
vehicle fleet — registration, insurance, roadworthiness, maintenance, repairs,
fuel, reminders and depreciation.

This project is built in numbered phases. **Current status: Phase 9 complete.**

---

## 🚀 Try it on your own computer (one step)

Just want to see it running locally? You only need **Docker Desktop** installed
and running. No config, no `.env`, nothing to edit.

**Mac:** double-click **`start-local.command`** in this folder. It builds the
app, waits for it to be ready, and opens it in your browser. (First time, if
macOS blocks it: right-click the file → **Open** → **Open**.)

**Any system (one command):** open a terminal in this `fleet-manager` folder and
run:

```bash
docker compose -f docker-compose.local.yml up -d --build
```

Then open **http://localhost:8080** and log in with **`owner` / `123456`**.

This local setup uses a built-in lightweight database (no password) and port
8080 (so it won't clash with anything on port 80). To stop it:
`docker compose -f docker-compose.local.yml down`.

> This is for trying it out only. To host it for real (your own domain + HTTPS),
> see the **[Server Setup Guide](DEPLOYMENT.md)**.

---

## 🔄 Getting the latest changes (auto-update)

A **ZIP download can't update itself** — to pull new changes you must get the
code with **`git`** once. Then updating is a single click.

**One-time switch to git** (replaces your ZIP folder). In a terminal:

```bash
# Pick a folder to keep the project in, then:
git clone --branch claude/vehicle-fleet-manager-c2l647 \
  https://github.com/edrisi6/Energia.git fleet-manager-app
cd fleet-manager-app/fleet-manager
```

**From then on, to get the newest version:**

- **Mac:** double-click **`update-local.command`** — it pulls the latest code
  and rebuilds. (First time: right-click → **Open** → **Open**.)
- **Any system:**
  ```bash
  git pull
  docker compose -f docker-compose.local.yml up -d --build
  ```

> Running on a server, or have Docker Hub building from GitHub? Those can update
> automatically on every push — tell me your setup and I'll wire it up.

---

## 📦 Moving this app to its own repository

This app currently lives in the `fleet-manager/` folder of the **Energia** repo
(which is an unrelated project). To give it a clean, dedicated home:

1. On GitHub, create a **new empty repository** (e.g. `fleet-manager`) — no
   README, no `.gitignore`.
2. On your computer, run (replace `YOUR-USER` with your GitHub username):

   ```bash
   # Get just this app's files (a fresh copy, no Energia history)
   git clone --branch claude/vehicle-fleet-manager-c2l647 --depth 1 \
     https://github.com/edrisi6/Energia.git _tmp
   cp -R _tmp/fleet-manager fleet-manager && rm -rf _tmp

   # Make it its own repo and push to the new home
   cd fleet-manager
   git init -b main
   git add .
   git commit -m "Vehicle Fleet Manager"
   git remote add origin https://github.com/YOUR-USER/fleet-manager.git
   git push -u origin main
   ```

After this, the app is a standalone repo on `main`, and updates are a plain
`git pull`. (I can't create or push that new repo from here — my access is
limited to the Energia repo — but the steps above do it from your machine in a
couple of minutes.)

---

## Phase 9 — VIN-first add-a-vehicle (done)

Adding a vehicle is now mostly automatic — minimal typing:

- **Start with the VIN.** The add-vehicle form leads with a "Start with the
  VIN" card: photograph the VIN plate (or type the VIN), and the app reads it.
- **Automatic lookup.** The VIN is decoded against the **free, public NHTSA
  vPIC database** (no API key, no cost) to fill in **make, model, year, engine
  and fuel type** — you just review and save.
- **Optional AI top-up.** When AI is enabled, one tap estimates the
  manufacturer's fuel consumption (L/100km) for the decoded vehicle.

Endpoint: `GET /api/vin/decode?vin=...` (free) and `POST /api/ai/enrich-specs`
(optional, owner/manager). The VIN decoder needs outbound internet to reach the
public database — that's available on any normal server/computer.

---

## Phase 8 — Camera capture & photo scanning (done)

Adding a vehicle's photos is now faster, and the app can read details off them:

- **One-tap camera.** Each photo slot has a **📷 Take photo** button that opens
  the camera directly on phones, alongside **📁 Choose file**.
- **Free on-device scanning (OCR).** After taking a Rego or VIN photo, tap
  **🔎 Scan (free)** — it reads the text *in the browser* (private, nothing is
  uploaded) and fills the field for you to confirm.
- **Optional cloud AI scanning.** When enabled, a **✨ Scan with AI** button
  appears for higher accuracy, and a spec-sheet scanner can pull the
  manufacturer's L/100km figure straight off a brochure. This is **off by
  default** and several things keep the cost tiny:
  - **Opt-in per scan** — it only runs when someone taps the button.
  - **Bring-your-own-key, off by default** — no key, no feature, no cost. Turn
    it on by setting `ANTHROPIC_API_KEY` (see `.env`); only Owners/Managers can
    trigger a scan.
  - **Images are downscaled** before sending, and you can pick the cheapest
    model with `AI_MODEL=claude-haiku-4-5`.

The fuel logs already carry a `source` field, so the planned automated feed from
a petrol-station e-payment system can be added later without schema changes.

---

## Phase 7 — Photos, manufacturer specs & tyres (done)

- **Vehicle photos/documents.** When adding or editing a vehicle you can upload
  three files — **Rego**, **VIN plate**, and a **compliance document**
  (insurance certificate / roadworthiness / test report). Images and PDFs up to
  10 MB. Files are stored privately and only viewable by logged-in users (via
  the **Documents** tab). Uploads persist in a Docker volume.
- **Manufacturer fuel consumption.** A dedicated field for the factory-rated
  L/100km, separate from the measured "actual" figure. If no actual figure is
  recorded yet, the fuel→km estimate falls back to the manufacturer's number.
- **Tyres.** Record a tyre set (brand, type/size, manufacturer's rated km, and
  the odometer when fitted). The **Tyres** tab shows a wear bar and flags when
  they're due for replacement, and tyre-replacement alerts appear on the
  dashboard alongside services.
- **Future-ready:** fuel logs now carry a `source` field, so a later automated
  feed from a petrol-station e-payment system can be added without schema
  changes.

New endpoints: `GET /api/vehicles/:id/tyre-status` and the document routes
`GET/POST/DELETE /api/vehicles/:id/documents` (+ `/:docId/file`).

---

## Phase 6 — Polish & deploy (done)

- **Installable app (PWA).** The frontend is now an installable Progressive Web
  App with its own icon, an offline app shell (service worker), and a
  standalone display mode — staff can "Add to Home Screen" on a phone and open
  it like a native app. (API calls are never cached, so data stays live.)
- **Sturdier UX.** A global error boundary shows a friendly "something went
  wrong / reload" screen instead of a blank page, and an expired session
  automatically returns you to the login screen.
- **One-command deploy.** `docker-compose` runs PostgreSQL, the API, and
  **Caddy** (which serves the app and provides **automatic HTTPS**).
- **Nightly backups.** A `scripts/backup.sh` script dumps the database on a
  schedule and keeps the last 14 copies.

### Deploy on your own server (production)

> 📘 **Starting from a brand-new, empty server?** Follow the complete
> step-by-step **[Server Setup Guide](DEPLOYMENT.md)** — it assumes nothing is
> installed and covers getting a server, pointing your domain, installing
> Docker, deploying, installing on phones, and backups.

The short version (for a server that already has **Docker** and a **domain**
pointing at it):

```bash
cd fleet-manager

# 1) Configure
cp .env.example .env
#    Edit .env and set, at minimum:
#      DOMAIN       -> your domain, e.g. fleet.example.com  (for auto HTTPS)
#      PGPASSWORD   -> a strong database password
#      JWT_SECRET   -> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
#      OWNER_PIN    -> the first owner's 6+ digit PIN

# 2) Launch everything (builds images on first run)
docker compose up -d --build
```

That's it. Visit **https://your-domain** and log in. Caddy obtains and renews
the HTTPS certificate automatically. To try it locally first, leave
`DOMAIN=:80` and open **http://localhost**.

Useful commands:

```bash
docker compose logs -f          # watch logs
docker compose down             # stop (data is kept in volumes)
docker compose up -d --build    # apply an update / redeploy
```

### Install it on a phone

Open the site in the phone's browser → browser menu → **Add to Home Screen**.
It then launches full-screen with its own icon, like an app.

### Nightly database backups

Run the backup script (dumps the DB to `./backups`, keeps the last 14):

```bash
./scripts/backup.sh
```

Schedule it nightly with cron (`crontab -e`):

```
0 2 * * * /full/path/to/fleet-manager/scripts/backup.sh >> /var/log/fleet-backup.log 2>&1
```

To restore a backup:

```bash
gunzip -c backups/fleet-YYYYMMDD-HHMMSS.sql.gz | \
  docker compose exec -T db psql -U fleet fleet
```

---

## Phase 5 — Reminders & calendar (done)

The app now tells you what needs attention before it bites you:

- **Daily reminder job.** A built-in scheduler recomputes reminders on startup
  and every 24 hours, looking at registration / insurance / roadworthy expiry
  dates and whether a service is due, and tagging each
  **upcoming / due / overdue** (with 30 / 14 / 1-day alert levels).
- **"Attention needed" dashboard.** Overdue and soon-due items appear on the
  dashboard, colour-coded, each linking to its vehicle.
- **Add to calendar.** Every reminder and dated record (registration,
  insurance, roadworthy expiries, next service) has an **Add to calendar**
  button that downloads a real `.ics` file (with a 14-day alarm) you can open
  in Google / Apple / Outlook calendar.

New endpoints: `GET /api/reminders` (`?attention=1` for the dashboard),
`POST /api/reminders/recompute`, and `GET /api/calendar/event.ics`. Running the
app is unchanged (two-terminal flow from Phase 2).

---

## Phase 4 — Smart logic (done)

The app now does the thinking for you:

- **Fuel money → kilometres.** Log how much you spent and the price per litre;
  the app works out the litres and estimates the distance that fuel covers
  (`litres = amount / price`, `estimated_km = litres × 100 / consumption`). It
  only fills in values you didn't type, so exact figures are never overwritten.
- **"Service due?" engine.** Set service rules per vehicle (every X km, every
  X months, and/or counting fuel-estimated km). The Maintenance tab shows a
  clear red/green banner and explains exactly which rule triggered.
- **Depreciation + Value chart.** Current value is computed as
  `purchase_price × (1 − rate) ^ years_owned`; a manual override always wins.
  The Value tab shows the current/purchase figures and a chart of purchase
  value vs estimated value over time.

New read-only endpoints: `GET /api/vehicles/:id/value` and
`GET /api/vehicles/:id/service-status`. Running the app is unchanged
(two-terminal flow from Phase 2).

---

## Phase 3 — Records + history timeline (done)

Every tab on the vehicle page is now real:

- **Registration, Insurance, Roadworthy** records — add/edit/delete
  (Owners & Managers only).
- **Maintenance, Repairs, Fuel** logs — add/edit/delete (Service Operators
  can do these too, since they do the work). Repairs and Fuel include a
  **driver** dropdown.
- **History log** tab: maintenance + repairs + fuel merged into one
  date-sorted timeline per vehicle.

Under the hood, a single generic record engine (backend + frontend) drives all
six record types from one config file, so the code stays small and consistent.
Role rules are enforced on the server for every record type, not just hidden in
the UI. Running the app is the same two-terminal flow as Phase 2.

---

## Phase 2 — Vehicles + the visual app (done)

Phase 2 adds the first thing you can actually open and click:

- **Vehicles API** (backend): list, view, create, edit, delete — with role
  rules enforced on the server (Owners/Managers can change vehicles; Service
  Operators can only view).
- **React PWA frontend** (`frontend/`) built with Vite + Tailwind:
  - **PIN keypad login screen**.
  - **Dashboard** with a fleet summary (vehicle count + total value) and an
    "Attention needed" area (filled by the reminders engine in Phase 5).
  - **Vehicle list** → **Vehicle detail** with the full tab shell
    (Overview · History log · Registration · Insurance · Roadworthy ·
    Maintenance · Repairs · Fuel · Value). Overview is live; the other tabs
    are labelled with the phase that fills them.
  - **Add / Edit vehicle** form and a guarded **delete**.

### How to run the whole app (Phase 2)

You need **two terminals** — one for the backend, one for the frontend.

```bash
# Terminal 1 — backend API
cd fleet-manager/backend
npm install            # first time only
cp .env.example .env   # first time only; set JWT_SECRET + OWNER_PIN
npm run setup          # first time only; creates DB + owner
npm run dev            # leave running -> http://localhost:4000

# Terminal 2 — frontend app
cd fleet-manager/frontend
npm install            # first time only
npm run dev            # leave running -> http://localhost:5173
```

Then open **http://localhost:5173** in your browser and log in with the
username + PIN from your `.env` (defaults: `owner` / the PIN you set).
The frontend automatically talks to the backend — no extra setup.

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
