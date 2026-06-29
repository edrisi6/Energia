// ─────────────────────────────────────────────────────────────
// Authentication business logic, kept separate from HTTP concerns.
// Handles the login flow including the account-lockout policy:
//   - Each wrong PIN increments failed_attempts.
//   - After MAX_FAILED_ATTEMPTS, the account is locked for LOCKOUT_MINUTES.
//   - A correct PIN resets the counter and clears any lock.
// ─────────────────────────────────────────────────────────────
const db = require('../db');
const config = require('../config');
const { verifyPin } = require('../utils/pin');
const { signToken } = require('../utils/jwt');

// A custom error type so the controller can map failures to HTTP codes.
class AuthError extends Error {
  constructor(message, status = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
    this.publicMessage = message;
  }
}

// Strip sensitive fields before returning a user to the client.
function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    role: row.role,
    created_at: row.created_at,
  };
}

function isLocked(user) {
  if (!user.locked_until) return false;
  return new Date(user.locked_until).getTime() > Date.now();
}

/**
 * Attempt to log a user in with username + PIN.
 * @returns {Promise<{ token: string, user: object }>}
 * @throws {AuthError} on bad credentials or a locked account.
 */
async function login(username, pin) {
  if (!username || !pin) {
    throw new AuthError('Username and PIN are required.', 400);
  }

  const user = await db('users').where({ username }).first();

  // Generic message whether the user exists or not — don't leak which
  // usernames are valid. (We still do the lockout bookkeeping below only
  // for real users.)
  const GENERIC = 'Invalid username or PIN.';

  if (!user) {
    throw new AuthError(GENERIC, 401);
  }

  // Refuse early if the account is currently locked.
  if (isLocked(user)) {
    const unlockAt = new Date(user.locked_until);
    throw new AuthError(
      `Account locked due to too many failed attempts. Try again after ${unlockAt.toISOString()}.`,
      423 // 423 Locked
    );
  }

  const ok = await verifyPin(pin, user.pin_hash);

  if (!ok) {
    await registerFailedAttempt(user);
    throw new AuthError(GENERIC, 401);
  }

  // Success: clear any failed-attempt state.
  await db('users')
    .where({ id: user.id })
    .update({ failed_attempts: 0, locked_until: null });

  const token = signToken(user);
  return { token, user: publicUser(user) };
}

/**
 * Increment the failed-attempt counter and lock the account if the
 * threshold is reached.
 */
async function registerFailedAttempt(user) {
  const attempts = (user.failed_attempts || 0) + 1;
  const update = { failed_attempts: attempts };

  if (attempts >= config.auth.maxFailedAttempts) {
    const lockUntil = new Date(
      Date.now() + config.auth.lockoutMinutes * 60 * 1000
    );
    update.locked_until = lockUntil.toISOString();
    // Reset the counter so the cycle restarts cleanly after the lock expires.
    update.failed_attempts = 0;
  }

  await db('users').where({ id: user.id }).update(update);
}

/**
 * Load the current user fresh from the DB (used by GET /auth/me).
 */
async function getById(id) {
  const user = await db('users').where({ id }).first();
  return user ? publicUser(user) : null;
}

module.exports = { login, getById, AuthError, publicUser };
