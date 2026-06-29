// ─────────────────────────────────────────────────────────────
// Top-level API router. Mounts feature routers under /api/*.
// Later phases will add: vehicles, records, reminders, etc.
// ─────────────────────────────────────────────────────────────
const express = require('express');
const authRoutes = require('./auth');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { ROLES } = require('../utils/roles');

const router = express.Router();

router.use('/auth', authRoutes);

// Small demo endpoint to prove role-based access control works end to end.
// Only owners and managers may reach it; a service_operator gets 403.
// (This will be replaced by real admin routes in a later phase.)
router.get(
  '/admin/ping',
  requireAuth,
  requireRole(ROLES.OWNER, ROLES.MANAGER),
  (req, res) => {
    res.json({ ok: true, message: `Hello ${req.user.username} (${req.user.role})` });
  }
);

module.exports = router;
