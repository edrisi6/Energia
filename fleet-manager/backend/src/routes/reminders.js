// ─────────────────────────────────────────────────────────────
// Reminder routes.
// ─────────────────────────────────────────────────────────────
const express = require('express');
const reminderController = require('../controllers/reminderController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { ROLES } = require('../utils/roles');

const router = express.Router();

router.use(requireAuth);

router.get('/', reminderController.list);
router.post(
  '/recompute',
  requireRole(ROLES.OWNER, ROLES.MANAGER),
  reminderController.recompute
);

module.exports = router;
