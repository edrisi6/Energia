#!/bin/bash
# ─────────────────────────────────────────────────────────────
# Double-click this file (Mac) to start the Fleet Manager locally.
# It builds + launches the app and opens it in your browser.
#
# First time: if macOS says it "cannot be opened", right-click this file →
# Open → Open. (You only need to do that once.)
# ─────────────────────────────────────────────────────────────
set -e

# Always run from this file's own folder.
cd "$(dirname "$0")"

echo "================================================================"
echo "  Vehicle Fleet Manager — starting locally"
echo "  (the first run builds everything and can take a few minutes)"
echo "================================================================"

# Make sure Docker is running.
if ! docker info >/dev/null 2>&1; then
  echo
  echo "❌ Docker isn't running. Please open Docker Desktop, wait until it says"
  echo "   'running', then double-click this file again."
  echo
  read -r -p "Press Enter to close..."
  exit 1
fi

# Build + start using the zero-config local setup.
docker compose -f docker-compose.local.yml up -d --build

echo
echo "Waiting for the app to be ready..."
for i in $(seq 1 90); do
  if curl -sf http://localhost:8080 >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo
echo "✅ Ready! Opening http://localhost:8080"
echo "   Log in with username 'owner' and PIN '123456'."
echo
echo "To stop the app later, run:"
echo "   docker compose -f docker-compose.local.yml down"
echo

# Open the app in the default browser.
open http://localhost:8080 || true

read -r -p "Press Enter to close this window..."
