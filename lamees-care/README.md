# Lamees Care

Mobile-first PWA that coordinates toilet reminders for Lamees among 6 family members. Every 2 hours (08:00–22:00) the server pushes a notification to all registered devices simultaneously. The first family member to respond claims the slot and the notification is dismissed on everyone else's phone.

---

## How it works

- **8 daily slots**: 08:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 22:00
- **All members** are notified if within their active hours
- **Abdullah, Melis, Seher** additionally require a GPS check within 300m of Lamees's address (checked 2 min before each slot)
- Notifications are delivered by the server via Web Push — the app does **not** need to be open
- All devices stay in sync via push; the Refresh button is a fallback

---

## Project structure

```
├── server.js          # Express + Web Push + SQLite + cron scheduler
├── public/
│   ├── index.html     # PWA frontend (all JS + CSS inline)
│   ├── sw.js          # Service worker (receives push, shows notification)
│   ├── manifest.json  # PWA manifest
│   └── icon.svg       # App icon
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── package.json
```

---

## Setup

### 1. Generate VAPID keys (once only)

```bash
npm install
npm run generate-keys
```

Copy the two lines of output — you'll need them in the next step.

### 2. Create your `.env` file

```bash
cp .env.example .env
```

Fill in the values:

```env
VAPID_PUBLIC_KEY=<from generate-keys>
VAPID_PRIVATE_KEY=<from generate-keys>
VAPID_EMAIL=your@email.com
TZ=Australia/Melbourne
PORT=3000
```

> **Keep the private key secret.** Never commit `.env` to git.

---

## Running locally with Docker

```bash
docker compose up --build
```

App is at `http://localhost:3000`.

The SQLite database is stored in a named Docker volume (`lamees-data`) so it persists across container restarts.

To stop:
```bash
docker compose down
```

To wipe the database and start fresh:
```bash
docker compose down -v
```

---

## Deploying to Railway

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
3. Select this repo (root directory is `/`)
4. Railway detects the `Dockerfile` automatically
5. Go to **Variables** and add all 5 keys from your `.env`
6. Go to **Settings → Networking → Generate Domain** to get your public URL
7. Optionally add a **Volume** mounted at `/app/data` so the database survives redeploys

---

## Family member setup (per device)

1. Open the app URL in **Safari** (iPhone) or **Chrome** (Android)
2. Tap **Share → Add to Home Screen** (iPhone) or **Install app** (Android)
3. Open the installed app and tap **Enable** when prompted for notifications
4. Tap **Allow** for location if you are one of the members who requires it

That's it — the device is now registered and will receive push notifications in the background.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `VAPID_PUBLIC_KEY` | ✅ | Web Push public key |
| `VAPID_PRIVATE_KEY` | ✅ | Web Push private key |
| `VAPID_EMAIL` | ✅ | Contact email for push service |
| `TZ` | ✅ | Timezone for slot scheduling (e.g. `Australia/Melbourne`) |
| `PORT` | — | HTTP port (default `3000`; Railway sets this automatically) |
| `DB_PATH` | — | SQLite file path (default `./data/lamees.db`) |
