// ─────────────────────────────────────────────────────────────
// Central configuration loader.
// Reads environment variables (from .env in dev) ONCE and exposes a
// single, validated config object that the rest of the app imports.
// Keeping this in one place means there are no scattered process.env
// reads and no surprises about defaults.
// ─────────────────────────────────────────────────────────────
require('dotenv').config();

const path = require('path');

// Small helper: read an env var with a fallback default.
function env(key, fallback) {
  const value = process.env[key];
  return value === undefined || value === '' ? fallback : value;
}

// Small helper: read an integer env var safely.
function intEnv(key, fallback) {
  const value = parseInt(process.env[key], 10);
  return Number.isNaN(value) ? fallback : value;
}

const dbClient = env('DB_CLIENT', 'sqlite');

const config = {
  env: env('NODE_ENV', 'development'),
  port: intEnv('PORT', 4000),

  // CORS origins as an array (Express/cors accepts an array).
  corsOrigins: env('CORS_ORIGIN', 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  db: {
    client: dbClient, // "sqlite" or "postgres"
    sqliteFile: path.resolve(
      __dirname,
      '../../',
      env('SQLITE_FILE', './data/fleet.sqlite')
    ),
    postgres: {
      host: env('PGHOST', 'localhost'),
      port: intEnv('PGPORT', 5432),
      user: env('PGUSER', 'fleet'),
      password: env('PGPASSWORD', ''),
      database: env('PGDATABASE', 'fleet'),
    },
  },

  // Where uploaded vehicle documents/photos are stored on disk. In Docker this
  // points at a mounted volume so files persist across restarts.
  uploads: {
    dir: path.resolve(__dirname, '../../', env('UPLOADS_DIR', './data/uploads')),
    maxBytes: intEnv('UPLOAD_MAX_BYTES', 10 * 1024 * 1024), // 10 MB
  },

  auth: {
    jwtSecret: env('JWT_SECRET', ''),
    jwtExpiresIn: env('JWT_EXPIRES_IN', '12h'),
    bcryptRounds: intEnv('BCRYPT_ROUNDS', 12),
    maxFailedAttempts: intEnv('MAX_FAILED_ATTEMPTS', 5),
    lockoutMinutes: intEnv('LOCKOUT_MINUTES', 15),
  },

  // Values used only by the seed script to create the first owner.
  seedOwner: {
    name: env('OWNER_NAME', 'Fleet Owner'),
    username: env('OWNER_USERNAME', 'owner'),
    pin: env('OWNER_PIN', ''),
  },
};

// Fail fast on misconfiguration that would silently break security.
if (!config.auth.jwtSecret || config.auth.jwtSecret.length < 16) {
  // In production a weak/empty secret is a hard error.
  const message =
    'JWT_SECRET is missing or too short. Set a long random value in your .env file.';
  if (config.env === 'production') {
    throw new Error(message);
  } else {
    // In dev we warn loudly but still run, so first-time setup is painless.
    // eslint-disable-next-line no-console
    console.warn(`⚠️  ${message} (using an insecure dev default)`);
    config.auth.jwtSecret = 'insecure-dev-secret-change-me';
  }
}

module.exports = config;
