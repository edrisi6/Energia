# ─────────────────────────────────────────────────────────────
# Frontend image: build the React app, then serve it with Caddy (which also
# reverse-proxies /api to the backend and provides automatic HTTPS).
# ─────────────────────────────────────────────────────────────

# 1) Build the static site.
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 2) Serve with Caddy.
FROM caddy:2-alpine
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
EXPOSE 80 443
