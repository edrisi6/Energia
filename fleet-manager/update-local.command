#!/bin/bash
# ─────────────────────────────────────────────────────────────
# Double-click (Mac) to UPDATE the Fleet Manager to the latest version.
# It pulls the newest code from GitHub and rebuilds the app.
#
# Requires that you got the code with `git clone` (not a ZIP download).
# First time: if macOS blocks it, right-click this file → Open → Open.
# ─────────────────────────────────────────────────────────────
set -e
cd "$(dirname "$0")"

echo "================================================================"
echo "  Updating Vehicle Fleet Manager"
echo "================================================================"

if ! docker info >/dev/null 2>&1; then
  echo "❌ Docker isn't running. Open Docker Desktop, wait until it says"
  echo "   'running', then double-click this file again."
  read -r -p "Press Enter to close..."
  exit 1
fi

if [ -d .git ] || git rev-parse --git-dir >/dev/null 2>&1; then
  echo "Pulling the latest changes from GitHub..."
  git pull --ff-only || {
    echo "⚠️  Could not pull automatically (you may have local edits)."
    echo "    The app will still rebuild from the current code."
  }
else
  echo "⚠️  This folder isn't a git clone, so it can't pull updates."
  echo "    See the README section 'Getting my latest changes' to switch"
  echo "    from a ZIP download to 'git clone' (one-time)."
fi

echo "Rebuilding and restarting (this can take a few minutes)..."
docker compose -f docker-compose.local.yml up -d --build

echo "Waiting for the app to be ready..."
for i in $(seq 1 90); do
  if curl -sf http://localhost:8080 >/dev/null 2>&1; then break; fi
  sleep 2
done

echo "✅ Updated. Opening http://localhost:8080"
open http://localhost:8080 || true
read -r -p "Press Enter to close this window..."
