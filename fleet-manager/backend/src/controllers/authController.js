// ─────────────────────────────────────────────────────────────
// HTTP layer for authentication. Thin: it parses the request, calls the
// service, and shapes the response. All real logic lives in authService.
// ─────────────────────────────────────────────────────────────
const authService = require('../services/authService');

async function login(req, res, next) {
  try {
    const { username, pin } = req.body || {};
    const result = await authService.login(username, pin);
    res.json(result); // { token, user }
  } catch (err) {
    if (err instanceof authService.AuthError) {
      return res.status(err.status).json({ error: err.message });
    }
    return next(err);
  }
}

// Returns the currently authenticated user (requires a valid token).
async function me(req, res, next) {
  try {
    const user = await authService.getById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User no longer exists.' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, me };
