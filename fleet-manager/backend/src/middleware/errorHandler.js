// ─────────────────────────────────────────────────────────────
// Centralised error handling.
// - notFound: turns unmatched routes into a clean 404.
// - errorHandler: catches anything thrown in a handler and returns a
//   consistent JSON shape, hiding internal details in production.
// ─────────────────────────────────────────────────────────────
const config = require('../config');

function notFound(req, res) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
}

// Express recognises this as an error handler because it has 4 arguments.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-console
  console.error('Unhandled error:', err);

  const status = err.status || 500;
  const body = { error: err.publicMessage || 'Something went wrong.' };

  // In development, include the message + stack to make debugging easier.
  if (config.env !== 'production') {
    body.detail = err.message;
  }

  res.status(status).json(body);
}

module.exports = { notFound, errorHandler };
