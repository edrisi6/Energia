# Lamees Care — Handover

## What's in this folder

A self-contained Node.js PWA. Unzip, fill in one config file, and run with Docker. No other tools needed.

```
lamees-care/
├── public/            # Browser app (HTML, service worker, icons)
├── server.js          # Backend: push notifications + API + scheduler
├── Dockerfile         # Production container
├── docker-compose.yml # Local dev
├── package.json
├── package-lock.json
├── .env.example       # Copy this to .env and fill in
├── .gitignore
├── .dockerignore
└── README.md          # Full reference
```

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- A [GitHub](https://github.com) account (to host the repo)
- A [Railway](https://railway.app) account (to host the live server) — free trial available

---

## Step 1 — Create your `.env` file

Copy the example and fill in the values:

```bash
cp .env.example .env
```

Open `.env` and set:

```env
VAPID_PUBLIC_KEY=BODeP9rwQFeaJHVHChSxH-8GealULbEGQzOwml3HBW5ywmouhHNU0JlMQwOakZzIvyts8ICqxQpSZB8T4EO6FSw
VAPID_PRIVATE_KEY=4j6cjcqzh7z-fRPmXxElzk09EFNzAW2Jm4M5hodH0-s
VAPID_EMAIL=edrisi6@gmail.com
TZ=Australia/Melbourne
PORT=3000
```

> The VAPID keys above are already generated for this app. Keep the private key secret — never share or commit it.

---

## Step 2 — Run locally with Docker

```bash
docker compose up --build
```

Open `http://localhost:3000` in your browser.  
The database is stored in a Docker volume and survives restarts.

To stop: `docker compose down`

---

## Step 3 — Push to GitHub

1. Go to [github.com/new](https://github.com/new)
2. Name the repo `lamees-care`
3. Leave it **empty** (no README, no .gitignore) → click **Create repository**
4. In a terminal inside this folder:

```bash
git init -b main
git add .
git commit -m "Initial commit — Lamees Care"
git remote add origin https://github.com/YOUR_USERNAME/lamees-care.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

---

## Step 4 — Deploy to Railway

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select `lamees-care` (root directory is `/`)
3. Railway detects the `Dockerfile` automatically — no config needed
4. Go to **Variables** and add these 5 (copy from your `.env`):
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_EMAIL`
   - `TZ`
   - `PORT` → set to `3000`
5. Go to **Settings → Networking → Generate Domain**
6. Copy the `https://` URL — this is the link you share with the family

> **Optional but recommended:** add a Railway **Volume** mounted at `/app/data` so the database survives redeploys. Without it, push subscriptions reset on each deploy (family members just need to re-open the app once to re-register).

---

## Step 5 — Family member setup (each device, once)

1. Open the Railway URL in **Safari** (iPhone) or **Chrome** (Android)
2. **iPhone:** tap Share → Add to Home Screen  
   **Android:** tap the browser menu → Install app
3. Open the installed app icon
4. Tap **Enable** when asked for notifications → tap **Allow**
5. If prompted for location (Abdullah, Melis, Seher only) → tap **Allow**

The device is now registered. Notifications arrive in the background even when the app is closed.

---

## Family members & rules

| Name | Active hours | Location check |
|---|---|---|
| Mother Sezen | 06:30 – 24:00 | No |
| Sister Lina | 06:30 – 21:00 | No |
| Brother Edris | 06:30 – 21:00 | No |
| Auntie Melis | 06:30 – 24:00 | Must be within 300m |
| Auntie Seher | 06:30 – 24:00 | Must be within 300m |
| Father Abdullah | 06:30 – 24:00 | Must be within 300m |

Reminder slots: **08:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 22:00**

---

## Troubleshooting

| Problem | Fix |
|---|---|
| No notifications on iPhone | Make sure the app is installed to Home Screen, not just opened in Safari |
| Location-required member not appearing in the response sheet | Their device's location was denied or they're more than 300m away |
| Family member stopped getting notifications after a redeploy | They need to open the app once — it re-registers automatically |
| Server won't start | Check that all 5 environment variables are set |
