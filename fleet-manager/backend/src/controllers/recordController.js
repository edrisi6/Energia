// ─────────────────────────────────────────────────────────────
// HTTP layer for vehicle records. The record type comes from the URL
// (:type), so one controller serves all six types.
// ─────────────────────────────────────────────────────────────
const recordService = require('../services/recordService');
const valueService = require('../services/valueService');
const serviceDueService = require('../services/serviceDueService');
const tyreService = require('../services/tyreService');

async function list(req, res, next) {
  try {
    const { vehicleId, type } = req.params;
    const records = await recordService.listByVehicle(type, vehicleId);
    res.json({ records });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { vehicleId, type } = req.params;
    const record = await recordService.create(type, vehicleId, req.body);
    res.status(201).json({ record });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { vehicleId, type, id } = req.params;
    const record = await recordService.update(type, vehicleId, id, req.body);
    res.json({ record });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const { vehicleId, type, id } = req.params;
    await recordService.remove(type, vehicleId, id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function history(req, res, next) {
  try {
    const items = await recordService.history(req.params.vehicleId);
    res.json({ items });
  } catch (err) {
    next(err);
  }
}

// Depreciation / value details + chart series for the Value tab.
async function value(req, res, next) {
  try {
    const data = await valueService.computeValue(req.params.vehicleId);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

// "Is a service due?" status for the Maintenance tab.
async function serviceStatus(req, res, next) {
  try {
    const data = await serviceDueService.computeServiceStatus(
      req.params.vehicleId
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
}

// "Are the tyres due?" status for the Tyres tab.
async function tyreStatus(req, res, next) {
  try {
    const data = await tyreService.computeTyreStatus(req.params.vehicleId);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  create,
  update,
  remove,
  history,
  value,
  serviceStatus,
  tyreStatus,
};
