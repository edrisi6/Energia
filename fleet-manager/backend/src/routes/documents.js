// ─────────────────────────────────────────────────────────────
// Vehicle document/photo routes (mounted under /api/vehicles/:vehicleId).
//   GET    /documents            list documents (any authenticated role)
//   POST   /documents            upload one file (owner/manager)
//   GET    /documents/:docId/file stream the file (any authenticated role)
//   DELETE /documents/:docId     delete (owner/manager)
//
// Uploads are handled by multer (kept in memory, then written to disk by the
// service). Only images and PDFs are accepted, up to the configured size.
// ─────────────────────────────────────────────────────────────
const express = require('express');
const multer = require('multer');
const documentController = require('../controllers/documentController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { ROLES } = require('../utils/roles');
const config = require('../config');

const router = express.Router({ mergeParams: true });

// Accept images and PDFs only, up to the configured maximum size.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.uploads.maxBytes },
  fileFilter: (req, file, cb) => {
    const ok =
      file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';
    if (ok) return cb(null, true);
    cb(new Error('Only image or PDF files are allowed.'));
  },
});

router.use(requireAuth);

router.get('/', documentController.list);
router.get('/:docId/file', documentController.download);

const canManage = requireRole(ROLES.OWNER, ROLES.MANAGER);

// Wrap multer so its errors (e.g. too large, wrong type) become clean 400s.
function uploadOne(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}

router.post('/', canManage, uploadOne, documentController.upload);
router.delete('/:docId', canManage, documentController.remove);

module.exports = router;
