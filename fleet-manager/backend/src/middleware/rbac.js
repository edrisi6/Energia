// ─────────────────────────────────────────────────────────────
// Role-Based Access Control (RBAC) middleware.
// Use AFTER requireAuth. Pass the roles allowed to hit an endpoint:
//   router.delete('/users/:id', requireAuth, requireRole('owner'), handler)
// Server-side enforcement is the source of truth — the UI hiding a button
// is only a convenience, never a security boundary.
// ─────────────────────────────────────────────────────────────
const { ALL_ROLES } = require('../utils/roles');

/**
 * @param {...string} allowedRoles roles permitted to access the route
 */
function requireRole(...allowedRoles) {
  // Guard against typos in route definitions.
  for (const role of allowedRoles) {
    if (!ALL_ROLES.includes(role)) {
      throw new Error(`requireRole: unknown role "${role}"`);
    }
  }

  return function roleGuard(req, res, next) {
    if (!req.user) {
      // requireAuth should have run first; this is a programming-error guard.
      return res.status(401).json({ error: 'Not authenticated.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: 'You do not have permission to perform this action.' });
    }
    return next();
  };
}

module.exports = { requireRole };
