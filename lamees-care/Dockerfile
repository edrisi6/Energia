FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server.js ./
COPY public/ ./public/

# Data directory for the SQLite database (mount a volume here)
RUN mkdir -p /app/data

EXPOSE 3000
CMD ["node", "server.js"]
