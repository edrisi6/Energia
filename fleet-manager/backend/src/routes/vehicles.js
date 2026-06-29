// ─────────────────────────────────────────────────────────────
// Vehicle routes with role-based access control.
//   GET    /api/vehicles      -> list      (all logged-in roles)
//   GET    /api/vehicles/:id  -> view one  (all logged-in roles)
//   POST   /api/vehicles      -> create    (owner, manager)
//   PUT    /api/vehicles/:id  -> update    (owner, manager)
//   DELETE /api/vehicles/:id  -> delete    (owner, manager)
//
// Service Operators can VIEW vehicles but cannot create/edit/delete them —
// enforced here on the server, not just hidden in the UI.
// ─────────────────────────────────────────────────────────────
const express = require('express');
const vehicleController = require('../controllers/vehicleController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { ROLES } = require('../utils/roles');

const router = express.Router();

// Everything here requires a logged-in user.
router.use(requireAuth);

// Read endpoints: any authenticated role.
router.get('/', vehicleController.list);
router.get('/:id', vehicleController.getOne);

// Write endpoints: owners and managers only.
const canManage = requireRole(ROLES.OWNER, ROLES.MANAGER);
router.post('/', canManage, vehicleController.create);
router.put('/:id', canManage, vehicleController.update);
router.delete('/:id', canManage, vehicleController.remove);

module.exports = router;
