// ─────────────────────────────────────────────────────────────
// AI scanning routes (optional feature).
//   GET  /api/ai/status   -> { enabled, model }   (any authenticated user)
//   POST /api/ai/extract  -> { target, data }     (owner/manager only)
//        multipart: field "image" + body "target" (vin|rego|spec)
//
// Only owners/managers can trigger a paid scan, so spend stays controlled.
// Returns 400 (clean message) if AI isn't configured.
// ─────────────────────────────────────────────────────────────
const express = require('express');
const multer = require('multer');
const aiService = require('../services/aiService');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { ROLES } = require('../utils/roles');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // images are downscaled client-side
  fileFilter: (req, file, cb) =>
    file.mimetype.startsWith('image/')
      ? cb(null, true)
      : cb(new Error('Only images can be scanned.')),
});

router.use(requireAuth);

router.get('/status', (req, res) => res.json(aiService.status()));

function uploadOne(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}

router.post(
  '/extract',
  requireRole(ROLES.OWNER, ROLES.MANAGER),
  uploadOne,
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'An image is required.' });
      const result = await aiService.extractFromImage(
        req.file.buffer,
        req.file.mimetype,
        req.body.target
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
