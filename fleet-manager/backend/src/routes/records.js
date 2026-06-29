// ─────────────────────────────────────────────────────────────
// Vehicle record routes (mergeParams lets us read :vehicleId from the
// parent path). Mounted under /api/vehicles/:vehicleId.
//
//   GET    /records/:type        list records of a type for the vehicle
//   POST   /records/:type        create   (role checked per type)
//   PUT    /records/:type/:id    update   (role checked per type)
//   DELETE /records/:type/:id    delete   (role checked per type)
//   GET    /history              merged maintenance+repairs+fuel timeline
// ─────────────────────────────────────────────────────────────
const express = require('express');
const recordController = require('../controllers/recordController');
const { requireAuth } = require('../middleware/auth');
const { RECORD_TYPES } = require('../config/recordTypes');

const router = express.Router({ mergeParams: true });

// Every record route requires login.
router.use(requireAuth);

// Per-type write guard: reads the :type from the URL, looks up which roles
// may write that record type, and rejects others. This is the server-side
// enforcement of "service operators can log fuel/maintenance/repairs but not
// registration/insurance/roadworthy".
function requireRecordWrite(req, res, next) {
  const cfg = RECORD_TYPES[req.params.type];
  if (!cfg) {
    return res.status(404).json({ error: `Unknown record type "${req.params.type}".` });
  }
  if (!cfg.writeRoles.includes(req.user.role)) {
    return res
      .status(403)
      .json({ error: 'You do not have permission to change these records.' });
  }
  return next();
}

// Merged history timeline for the vehicle.
router.get('/history', recordController.history);

// Read records (any authenticated role).
router.get('/records/:type', recordController.list);

// Write records (role checked against the type).
router.post('/records/:type', requireRecordWrite, recordController.create);
router.put('/records/:type/:id', requireRecordWrite, recordController.update);
router.delete('/records/:type/:id', requireRecordWrite, recordController.remove);

module.exports = router;
