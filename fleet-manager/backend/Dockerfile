# ─────────────────────────────────────────────────────────────
# Backend API image.
# Debian-slim (glibc) so better-sqlite3 can use prebuilt binaries; production
# actually uses PostgreSQL, but the dependency is still installed.
# ─────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

# Install dependencies first (better layer caching).
COPY package*.json ./
RUN npm ci --omit=dev

# App source.
COPY . .

EXPOSE 4000

# On boot: apply migrations, ensure the owner account exists, then start.
# Seeding is idempotent, so this is safe on every restart.
CMD ["sh", "-c", "npm run migrate && npm run seed && node src/index.js"]
