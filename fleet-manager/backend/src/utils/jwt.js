// ─────────────────────────────────────────────────────────────
// JWT helpers: create and verify session tokens.
// The token carries the user's id, username and role. We keep the payload
// minimal — never put the PIN or hash in a token.
// ─────────────────────────────────────────────────────────────
const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Sign a session token for a logged-in user.
 * @param {{ id: number, username: string, role: string }} user
 */
function signToken(user) {
  const payload = {
    sub: user.id, // standard "subject" claim = the user id
    username: user.username,
    role: user.role,
  };
  return jwt.sign(payload, config.auth.jwtSecret, {
    expiresIn: config.auth.jwtExpiresIn,
  });
}

/**
 * Verify a token string and return its decoded payload.
 * Throws if the token is invalid or expired.
 */
function verifyToken(token) {
  return jwt.verify(token, config.auth.jwtSecret);
}

module.exports = { signToken, verifyToken };
