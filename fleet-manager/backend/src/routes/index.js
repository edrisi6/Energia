// ─────────────────────────────────────────────────────────────
// Top-level API router. Mounts feature routers under /api/*.
// Later phases will add: vehicles, records, reminders, etc.
// ─────────────────────────────────────────────────────────────
const express = require('express');
const authRoutes = require('./auth');
const vehicleRoutes = require('./vehicles');
const recordRoutes = require('./records');
const documentRoutes = require('./documents');
const userRoutes = require('./users');
const reminderRoutes = require('./reminders');
const calendarRoutes = require('./calendar');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { ROLES } = require('../utils/roles');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/reminders', reminderRoutes);
router.use('/calendar', calendarRoutes);
router.use('/vehicles', vehicleRoutes);
// Records + history live under a specific vehicle.
router.use('/vehicles/:vehicleId', recordRoutes);
router.use('/vehicles/:vehicleId/documents', documentRoutes);

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
