// ─────────────────────────────────────────────────────────────
// Builds the Knex configuration object based on our app config.
// Knex is a query builder that speaks both SQLite and PostgreSQL,
// so the SAME application code works in local dev (SQLite) and in
// production (PostgreSQL). We export the config so that both the
// running app AND the knex CLI (migrations/seeds) use identical settings.
// ─────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
const config = require('../config');

function buildKnexConfig() {
  // Make sure the folder for the SQLite file exists, so first-time setup
  // ("npm run setup") works with zero manual steps.
  if (config.db.client !== 'postgres') {
    const dir = path.dirname(config.db.sqliteFile);
    fs.mkdirSync(dir, { recursive: true });
  }

  if (config.db.client === 'postgres') {
    return {
      client: 'pg',
      connection: {
        host: config.db.postgres.host,
        port: config.db.postgres.port,
        user: config.db.postgres.user,
        password: config.db.postgres.password,
        database: config.db.postgres.database,
      },
      pool: { min: 2, max: 10 },
      migrations: {
        directory: path.resolve(__dirname, 'migrations'),
      },
      seeds: {
        directory: path.resolve(__dirname, 'seeds'),
      },
    };
  }

  // Default: SQLite. Great for local development — no server to install.
  return {
    client: 'better-sqlite3',
    connection: {
      filename: config.db.sqliteFile,
    },
    // SQLite has no real connection pool; this keeps Knex happy.
    useNullAsDefault: true,
    pool: {
      // Ensure foreign key constraints are enforced on every connection.
      afterCreate: (conn, done) => {
        conn.pragma('foreign_keys = ON');
        done(null, conn);
      },
    },
    migrations: {
      directory: path.resolve(__dirname, 'migrations'),
    },
    seeds: {
      directory: path.resolve(__dirname, 'seeds'),
    },
  };
}

module.exports = buildKnexConfig;
