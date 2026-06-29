// ─────────────────────────────────────────────────────────────
// User routes. For now just a read-only list (safe fields), used to populate
// driver dropdowns. Any authenticated role may read it. Creating/editing
// users (owner/manager only) comes in a later phase.
// ─────────────────────────────────────────────────────────────
const express = require('express');
const userService = require('../services/userService');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const users = await userService.list();
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
