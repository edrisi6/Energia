// ─────────────────────────────────────────────────────────────
// HTTP layer for vehicles. Thin — parses requests, calls the service,
// shapes responses. Errors bubble to the central error handler.
// ─────────────────────────────────────────────────────────────
const vehicleService = require('../services/vehicleService');

async function list(req, res, next) {
  try {
    const vehicles = await vehicleService.list();
    res.json({ vehicles });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const vehicle = await vehicleService.getById(req.params.id);
    res.json({ vehicle });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const vehicle = await vehicleService.create(req.body);
    res.status(201).json({ vehicle });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const vehicle = await vehicleService.update(req.params.id, req.body);
    res.json({ vehicle });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await vehicleService.remove(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, update, remove };
