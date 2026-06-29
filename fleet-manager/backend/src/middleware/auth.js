// ─────────────────────────────────────────────────────────────
// Authentication middleware.
// Reads the "Authorization: Bearer <token>" header, verifies the JWT, and
// attaches the decoded user to req.user. If the token is missing/invalid,
// the request is rejected with 401 before it reaches any route handler.
// ─────────────────────────────────────────────────────────────
const { verifyToken } = require('../utils/jwt');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res
      .status(401)
      .json({ error: 'Missing or malformed Authorization header.' });
  }

  try {
    const decoded = verifyToken(token);
    // Normalise into a friendly shape for the rest of the app.
    req.user = {
      id: decoded.sub,
      username: decoded.username,
      role: decoded.role,
    };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }
}

module.exports = { requireAuth };
