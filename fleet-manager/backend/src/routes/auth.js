// ─────────────────────────────────────────────────────────────
// Authentication routes.
//   POST /api/auth/login  -> { token, user }
//   GET  /api/auth/me     -> { user }   (requires a valid token)
// ─────────────────────────────────────────────────────────────
const express = require('express');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', authController.login);
router.get('/me', requireAuth, authController.me);

module.exports = router;
