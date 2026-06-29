// ─────────────────────────────────────────────────────────────
// Knex CLI entry point.
// The `knex` command-line tool (used by `npm run migrate` / `npm run seed`)
// reads THIS file. We simply reuse the exact same config the app uses, so
// migrations and the running server can never drift out of sync.
// ─────────────────────────────────────────────────────────────
const buildKnexConfig = require('./src/db/knex');

const knexConfig = buildKnexConfig();

// The CLI expects an object keyed by environment name. We expose the same
// config under every common name so it works regardless of NODE_ENV.
module.exports = {
  development: knexConfig,
  production: knexConfig,
  test: knexConfig,
};
