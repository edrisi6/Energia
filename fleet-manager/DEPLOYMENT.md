# Hosting the Vehicle Fleet Manager — Server Setup Guide

This guide takes you from **nothing** to a **live, secure app on your own
domain**, installable on staff phones. It assumes you have not set anything up
yet. No prior server experience is needed — just follow each step in order and
copy/paste the commands.

Everything you type is shown in `code blocks`. Lines starting with `#` are
explanations you do **not** type.

---

## 0. What you'll need (and roughly what it costs)

| Thing | What it is | Notes |
| --- | --- | --- |
| A **server** (VPS) | A small Linux computer in the cloud, on 24/7 | ~$5–12/month. 2 GB RAM recommended. |
| A **domain name** | e.g. `fleet.yourcompany.com` | ~$10–15/year. Needed for HTTPS. |
| Your **own computer** | To connect to the server | Mac/Linux: built-in Terminal. Windows: use the built-in **PowerShell** or install [Windows Terminal]. |

You do **not** need to install anything special on your own computer beyond a
terminal. Everything runs on the server.

> Throughout this guide, replace these placeholders with your real values:
> - `fleet.yourcompany.com` → your domain
> - `YOUR_SERVER_IP` → your server's IP address
> - `you@yourcompany.com` → your email

---

## 1. Get a server

Any provider that offers an **Ubuntu** server works (DigitalOcean, Hetzner,
Linode, Vultr, AWS Lightsail, etc.). When creating it, choose:

- **Operating system:** Ubuntu 24.04 LTS (or 22.04 LTS).
- **Size:** at least **2 GB RAM** / 1 CPU. (1 GB can work but may struggle to
  build; 2 GB is the safe choice.)
- **Authentication:** if offered, choose **SSH key** (more secure). If you only
  have a password, that's fine for now — the provider will email it to you.

When it's ready, the provider gives you the server's **IP address** (looks like
`203.0.113.45`). Write it down — that's `YOUR_SERVER_IP`.

---

## 2. Point your domain at the server

In your domain registrar's control panel (where you bought the domain), add a
**DNS "A" record**:

| Field | Value |
| --- | --- |
| Type | `A` |
| Name / Host | `fleet` (this makes `fleet.yourcompany.com`) — or `@` for the bare domain |
| Value / Points to | `YOUR_SERVER_IP` |
| TTL | leave default |

DNS changes can take a few minutes to a couple of hours to take effect. You can
continue with the next steps while it propagates.

> **Why:** HTTPS certificates are issued to a domain, not an IP. The domain
> must point at your server before the automatic HTTPS step works.

---

## 3. Connect to the server

On **your own computer**, open the terminal and connect as `root` (the server's
admin user):

```bash
ssh root@YOUR_SERVER_IP
```

- The first time, it asks "Are you sure you want to continue connecting?" — type
  `yes`.
- Enter the password (or it logs in automatically if you set up an SSH key).

You're now "inside" the server. The prompt changes to something like
`root@hostname:~#`.

---

## 4. Create a safe day-to-day user

Running everything as `root` is risky. Create a normal user with admin
(`sudo`) rights:

```bash
# Create a user called "fleet" (you can pick another name)
adduser fleet
# It asks for a password (set a strong one) and some optional details (press Enter to skip).

# Give that user admin rights
usermod -aG sudo fleet
```

Now switch to that user:

```bash
su - fleet
```

From here on, commands that need admin rights start with `sudo`.

---

## 5. Update the server and set up the firewall

```bash
# Update the list of available software and install updates
sudo apt update && sudo apt upgrade -y
```

Set up a basic firewall that only allows what the app needs:

```bash
sudo apt install -y ufw
sudo ufw allow OpenSSH      # so you don't lock yourself out
sudo ufw allow 80/tcp       # web (http)
sudo ufw allow 443/tcp      # web (https)
sudo ufw --force enable
sudo ufw status             # should list 22, 80, 443 as ALLOW
```

> **Why:** the firewall blocks everything except SSH (to manage the server) and
> web traffic (to serve the app).

---

## 6. Install Docker

The app runs in **Docker** containers, so you only install Docker — not Node,
PostgreSQL, etc. individually. Install it with Docker's official script:

```bash
# Download and run Docker's installer
curl -fsSL https://get.docker.com | sudo sh

# Allow your user to run Docker without typing sudo every time
sudo usermod -aG docker $USER
```

Now **log out and back in** so that group change takes effect:

```bash
exit          # leaves the "fleet" user
exit          # leaves the server
# then reconnect:
ssh fleet@YOUR_SERVER_IP
```

Check Docker works:

```bash
docker run --rm hello-world
```

You should see "Hello from Docker!". Also confirm Docker Compose is available
(it ships with modern Docker):

```bash
docker compose version
```

---

## 7. Get the app onto the server

The app lives in the `fleet-manager/` folder of your Git repository, on the
branch `claude/vehicle-fleet-manager-c2l647`.

```bash
# Install git
sudo apt install -y git

# Download just that branch (shallow = faster)
git clone --branch claude/vehicle-fleet-manager-c2l647 --depth 1 \
  https://github.com/edrisi6/Energia.git

# Go into the app folder
cd Energia/fleet-manager
```

> **If the repository is private**, the clone will ask for a username and
> password. GitHub no longer accepts your account password here — you need a
> **Personal Access Token**:
> 1. On GitHub: **Settings → Developer settings → Personal access tokens →
>    Tokens (classic) → Generate new token**, tick **`repo`**, generate, and
>    copy it.
> 2. When `git clone` asks for the **username**, enter your GitHub username;
>    for the **password**, paste the token.

You should now be in `~/Energia/fleet-manager`. Confirm the key files are here:

```bash
ls
# You should see: docker-compose.yml  .env.example  backend  frontend  scripts  README.md ...
```

---

## 8. Configure the app (`.env`)

Copy the example config and edit it:

```bash
cp .env.example .env
nano .env
```

`nano` is a simple text editor. Set these values (arrow keys to move, type to
edit):

```ini
# Your domain (must point at this server from Step 2).
# Caddy obtains and renews the HTTPS certificate automatically — no email needed.
DOMAIN=fleet.yourcompany.com

# Database — set a strong password (any long random text)
PGUSER=fleet
PGPASSWORD=PUT_A_STRONG_PASSWORD_HERE
PGDATABASE=fleet

# Security — see the next step for generating JWT_SECRET
JWT_SECRET=PASTE_GENERATED_SECRET_HERE

# The first owner login — change the PIN to something only you know (6+ digits)
OWNER_NAME=Fleet Owner
OWNER_USERNAME=owner
OWNER_PIN=246810
```

Leave the other values (`JWT_EXPIRES_IN`, `BCRYPT_ROUNDS`, etc.) as they are.

**Generate a strong `JWT_SECRET`.** This secret signs login sessions — it must
be long and random. In a *second* terminal connected to the server (or after
saving and reopening), run:

```bash
docker run --rm node:20-bookworm-slim node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Copy the long string it prints and paste it as the `JWT_SECRET` value in
`.env`.

To **save and exit** nano: press `Ctrl+O`, then `Enter`, then `Ctrl+X`.

> **Security:** the `.env` file holds secrets. It is never committed to Git
> (it's listed in `.gitignore`), and it stays only on your server.

---

## 9. Launch the app (the one command)

```bash
docker compose up -d --build
```

The first run takes a few minutes — it downloads the base images and builds the
app. When it finishes, check everything is running:

```bash
docker compose ps
# All three services (db, api, web) should show "running" / "Up".
```

Watch the logs for a minute to confirm it started cleanly (and that Caddy got
your HTTPS certificate):

```bash
docker compose logs -f
# Press Ctrl+C to stop watching (this does NOT stop the app).
```

Look for:
- `🚗 Fleet Manager API listening ...` (the backend started)
- Caddy obtaining a certificate for your domain (no errors about the challenge)

---

## 10. Open it and log in

On any device, go to:

```
https://fleet.yourcompany.com
```

You should see the **PIN login screen**. Log in with:
- **Username:** `owner` (or what you set as `OWNER_USERNAME`)
- **PIN:** the `OWNER_PIN` you chose

> **First thing to do:** the owner PIN was typed into a file, so treat it as
> temporary. (PIN-change-in-app is a small follow-up if you'd like it added.)

If the page doesn't load:
- Make sure DNS (Step 2) has finished — test with `ping fleet.yourcompany.com`;
  it should reply from `YOUR_SERVER_IP`.
- Re-check the logs: `docker compose logs -f web` (Caddy) and
  `docker compose logs -f api` (backend).

---

## 11. Install it on a phone

1. Open `https://fleet.yourcompany.com` in the phone's browser
   (Safari on iPhone, Chrome on Android).
2. Open the browser menu and tap **Add to Home Screen** (iPhone) or
   **Install app / Add to Home screen** (Android).
3. It now appears as an app icon and opens full-screen, like a native app.

Add each staff member as a user from the **Admin** area (owner/manager), and
they install it the same way.

---

## 12. Set up nightly backups

The app includes a backup script that dumps the database and keeps the last 14
copies.

Test it once:

```bash
cd ~/Energia/fleet-manager
./scripts/backup.sh
# It creates a file under ./backups/
```

Schedule it nightly at 2am with cron:

```bash
crontab -e
# If asked which editor, choose nano (option 1).
```

Add this line at the bottom (use the full path), then save (`Ctrl+O`, `Enter`,
`Ctrl+X`):

```
0 2 * * * /home/fleet/Energia/fleet-manager/scripts/backup.sh >> /home/fleet/fleet-backup.log 2>&1
```

**To restore** a backup later:

```bash
cd ~/Energia/fleet-manager
gunzip -c backups/fleet-YYYYMMDD-HHMMSS.sql.gz | docker compose exec -T db psql -U fleet fleet
```

> Consider also copying the `backups/` folder off the server periodically (e.g.
> to cloud storage) so a backup survives even if the server is lost.

---

## 13. Updating the app later

When there's a new version on the branch:

```bash
cd ~/Energia/fleet-manager
git pull
docker compose up -d --build
```

Your data is safe — it lives in a Docker **volume**, separate from the app code.

---

## 14. Everyday commands (cheat sheet)

Run these from `~/Energia/fleet-manager`:

| Command | What it does |
| --- | --- |
| `docker compose ps` | See if the app is running |
| `docker compose logs -f` | Watch live logs (Ctrl+C to stop watching) |
| `docker compose restart` | Restart the app |
| `docker compose down` | Stop the app (data is kept) |
| `docker compose up -d` | Start the app again |
| `docker compose up -d --build` | Rebuild + start (after an update) |
| `./scripts/backup.sh` | Make a database backup now |

---

## 15. Troubleshooting

**The site won't load / HTTPS error.**
- DNS may not have propagated yet — `ping fleet.yourcompany.com` should reply
  from your server's IP.
- Caddy needs ports 80 **and** 443 open — re-check `sudo ufw status`.
- Look at Caddy's logs: `docker compose logs web`.

**"Cannot connect" right after `docker compose up`.**
- The first build takes a few minutes; wait, then `docker compose ps`.

**The build runs out of memory / gets killed.**
- Your server likely has only 1 GB RAM. Add swap (temporary memory):
  ```bash
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  ```
  Then run `docker compose up -d --build` again.

**I forgot/locked the owner account.**
- Wait out the lockout window (`LOCKOUT_MINUTES`, default 15) and try again, or
  ask me to add an admin PIN-reset command.

**I changed `.env` — how do I apply it?**
- `docker compose up -d` (recreates the containers with the new values).

---

### Security checklist (recommended)

- [ ] You created a non-root `fleet` user and use it (Step 4).
- [ ] The firewall is on and only allows 22/80/443 (Step 5).
- [ ] `JWT_SECRET` is a long random value, and `PGPASSWORD` is strong (Step 8).
- [ ] You changed the owner PIN from the default.
- [ ] Backups run nightly and are copied off-server (Step 12).
- [ ] (Optional) Disable SSH password login and use SSH keys only.

---

That's the whole process. If you tell me your provider and domain, I can tailor
the exact commands and double-check anything that doesn't behave as described.
