// ─────────────────────────────────────────────────────────────
// VIN decode route.
//   GET /api/vin/decode?vin=...  -> { vin, decoded, fields }
// Free (public NHTSA vPIC) — any authenticated user can decode.
// ─────────────────────────────────────────────────────────────
const express = require('express');
const vinService = require('../services/vinService');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/decode', requireAuth, async (req, res, next) => {
  try {
    const result = await vinService.decode(req.query.vin);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
