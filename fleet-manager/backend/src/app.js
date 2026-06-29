// ─────────────────────────────────────────────────────────────
// Builds the Express application (no network listening here — that's in
// index.js). Separating "build the app" from "start the server" keeps
// things easy to test later.
// ─────────────────────────────────────────────────────────────
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const config = require('./config');
const apiRoutes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  // Security headers (sensible defaults for an API).
  app.use(helmet());

  // Allow the frontend origin(s) to call this API.
  app.use(cors({ origin: config.corsOrigins }));

  // Parse JSON request bodies.
  app.use(express.json());

  // Request logging (concise in dev).
  app.use(morgan('dev'));

  // Liveness check — handy for Docker/Caddy health checks later.
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // All application endpoints live under /api.
  app.use('/api', apiRoutes);

  // 404 + error handlers must be LAST.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
