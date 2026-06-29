// ─────────────────────────────────────────────────────────────
// Server entry point. Starts the HTTP listener and wires up a clean
// shutdown so the database connection closes properly.
// ─────────────────────────────────────────────────────────────
const createApp = require('./app');
const config = require('./config');
const db = require('./db');
const { startScheduler } = require('./scheduler');

const app = createApp();

const server = app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(
    `🚗 Fleet Manager API listening on http://localhost:${config.port} ` +
      `(db: ${config.db.client}, env: ${config.env})`
  );
  // Start the daily reminder recompute job.
  startScheduler();
});

// Graceful shutdown: stop accepting requests, then close the DB pool.
async function shutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(`\n${signal} received — shutting down...`);
  server.close(async () => {
    await db.destroy();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
