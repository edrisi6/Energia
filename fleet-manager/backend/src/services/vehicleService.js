// ─────────────────────────────────────────────────────────────
// Vehicle business logic: validation + database access for vehicles.
// Kept separate from HTTP so it's easy to test and reuse.
// ─────────────────────────────────────────────────────────────
const db = require('../db');
const {
  ValidationError,
  requireString,
  optionalString,
  optionalNumber,
  optionalDate,
} = require('../utils/validate');

// Turn raw request input into a clean, validated row ready for the DB.
// Used by both create and update.
function cleanVehicleInput(body = {}) {
  return {
    make: requireString(body.make, 'Make'),
    model: requireString(body.model, 'Model'),
    year: optionalNumber(body.year, 'Year', { min: 1900, max: 2200 }),
    engine_size: optionalString(body.engine_size, 'Engine size'),
    fuel_type: optionalString(body.fuel_type, 'Fuel type'),
    rego_number: optionalString(body.rego_number, 'Registration number'),
    vin: optionalString(body.vin, 'VIN'),
    purchase_price: optionalNumber(body.purchase_price, 'Purchase price', {
      min: 0,
    }),
    purchase_date: optionalDate(body.purchase_date, 'Purchase date'),
    current_value: optionalNumber(body.current_value, 'Current value', {
      min: 0,
    }),
    current_odometer_km: optionalNumber(
      body.current_odometer_km,
      'Current odometer',
      { min: 0 }
    ),
    fuel_consumption_l_per_100km: optionalNumber(
      body.fuel_consumption_l_per_100km,
      'Fuel consumption',
      { min: 0 }
    ),
    manufacturer_l_per_100km: optionalNumber(
      body.manufacturer_l_per_100km,
      'Manufacturer fuel consumption',
      { min: 0 }
    ),
    depreciation_rate: optionalNumber(
      body.depreciation_rate,
      'Depreciation rate',
      { min: 0, max: 1 }
    ),
    notes: optionalString(body.notes, 'Notes', { maxLen: 2000 }),
  };
}

async function list() {
  return db('vehicles').orderBy(['make', 'model']);
}

async function getById(id) {
  const vehicle = await db('vehicles').where({ id }).first();
  if (!vehicle) {
    throw new ValidationError('Vehicle not found.');
  }
  return vehicle;
}

async function create(body) {
  const data = cleanVehicleInput(body);
  // Default depreciation rate if not provided.
  if (data.depreciation_rate === null) data.depreciation_rate = 0.17;

  const [row] = await db('vehicles').insert(data).returning('*');
  // SQLite's returning support varies; fall back to a fetch if needed.
  if (row && typeof row === 'object') return row;
  const id = row;
  return getById(id);
}

async function update(id, body) {
  await getById(id); // throws if missing
  const data = cleanVehicleInput(body);
  if (data.depreciation_rate === null) data.depreciation_rate = 0.17;

  await db('vehicles').where({ id }).update(data);
  return getById(id);
}

async function remove(id) {
  const vehicle = await getById(id); // throws if missing
  // Related records are removed automatically via ON DELETE CASCADE.
  await db('vehicles').where({ id }).del();
  return vehicle;
}

module.exports = { list, getById, create, update, remove, cleanVehicleInput };
