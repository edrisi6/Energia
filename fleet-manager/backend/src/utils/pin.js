// ─────────────────────────────────────────────────────────────
// PIN helpers: validation + hashing.
// We NEVER store a raw PIN. We validate it meets policy, then hash it with
// bcrypt before it ever touches the database.
// ─────────────────────────────────────────────────────────────
const bcrypt = require('bcryptjs');
const config = require('../config');

// Policy: at least 6 digits, digits only.
const PIN_REGEX = /^\d{6,}$/;

/**
 * Check a PIN against our policy.
 * @returns {{ ok: boolean, message?: string }}
 */
function validatePin(pin) {
  if (typeof pin !== 'string' && typeof pin !== 'number') {
    return { ok: false, message: 'PIN is required.' };
  }
  const str = String(pin);
  if (!PIN_REGEX.test(str)) {
    return {
      ok: false,
      message: 'PIN must be at least 6 digits and contain digits only.',
    };
  }
  return { ok: true };
}

/**
 * Hash a PIN with bcrypt. Returns the hash string to store in pin_hash.
 */
async function hashPin(pin) {
  return bcrypt.hash(String(pin), config.auth.bcryptRounds);
}

/**
 * Compare a candidate PIN against a stored bcrypt hash.
 * @returns {Promise<boolean>}
 */
async function verifyPin(pin, hash) {
  if (!hash) return false;
  return bcrypt.compare(String(pin), hash);
}

module.exports = { validatePin, hashPin, verifyPin, PIN_REGEX };
