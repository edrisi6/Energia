// ─────────────────────────────────────────────────────────────
// Generic record service — handles CRUD for ALL vehicle record types
// (registration, insurance, roadworthy, maintenance, repairs, fuel) using
// the field definitions in config/recordTypes.js. One place, no duplication.
//
// Also builds the merged "history log" timeline (maintenance + repairs + fuel)
// for a vehicle.
// ─────────────────────────────────────────────────────────────
const db = require('../db');
const { RECORD_TYPES } = require('../config/recordTypes');
const vehicleService = require('./vehicleService');
const { deriveFuelEstimates } = require('./fuelMath');
const {
  ValidationError,
  requireString,
  optionalString,
  optionalNumber,
  optionalDate,
  optionalBool,
} = require('../utils/validate');

// Look up a record type config or throw a 404-ish error.
function getConfig(type) {
  const cfg = RECORD_TYPES[type];
  if (!cfg) throw new ValidationError(`Unknown record type "${type}".`);
  return cfg;
}

// Turn raw request input into a clean row using the field definitions.
function cleanRecord(type, body = {}) {
  const cfg = getConfig(type);
  const row = {};
  for (const f of cfg.fields) {
    const value = body[f.name];
    switch (f.kind) {
      case 'string':
        row[f.name] = f.required
          ? requireString(value, f.label, { maxLen: f.maxLen })
          : optionalString(value, f.label, { maxLen: f.maxLen });
        break;
      case 'number':
        row[f.name] = optionalNumber(value, f.label, { min: f.min, max: f.max });
        break;
      case 'date':
        row[f.name] = optionalDate(value, f.label);
        break;
      case 'bool':
        row[f.name] = optionalBool(value, false);
        break;
      case 'fk':
        // Foreign key to users (e.g. driver). Optional integer.
        row[f.name] = optionalNumber(value, f.label, { min: 1 });
        break;
      default:
        throw new Error(`Unhandled field kind "${f.kind}"`);
    }
  }
  return row;
}

async function listByVehicle(type, vehicleId) {
  const cfg = getConfig(type);
  await vehicleService.getById(vehicleId); // 404 if vehicle missing
  return db(cfg.table).where({ vehicle_id: vehicleId }).orderBy('id', 'desc');
}

async function getOne(type, vehicleId, id) {
  const cfg = getConfig(type);
  const row = await db(cfg.table)
    .where({ id, vehicle_id: vehicleId })
    .first();
  if (!row) throw new ValidationError('Record not found.');
  return row;
}

async function create(type, vehicleId, body) {
  const cfg = getConfig(type);
  const vehicle = await vehicleService.getById(vehicleId); // ensure it exists
  let data = cleanRecord(type, body);
  data.vehicle_id = Number(vehicleId);

  // For fuel logs, auto-fill litres + estimated_km from the money spent.
  if (type === 'fuel') data = deriveFuelEstimates(data, vehicle);

  const [row] = await db(cfg.table).insert(data).returning('*');
  if (row && typeof row === 'object') return row;
  return getOne(type, vehicleId, row);
}

async function update(type, vehicleId, id, body) {
  const cfg = getConfig(type);
  await getOne(type, vehicleId, id); // 404 if missing / wrong vehicle
  let data = cleanRecord(type, body);

  if (type === 'fuel') {
    const vehicle = await vehicleService.getById(vehicleId);
    data = deriveFuelEstimates(data, vehicle);
  }

  await db(cfg.table).where({ id, vehicle_id: vehicleId }).update(data);
  return getOne(type, vehicleId, id);
}

async function remove(type, vehicleId, id) {
  const cfg = getConfig(type);
  await getOne(type, vehicleId, id);
  await db(cfg.table).where({ id, vehicle_id: vehicleId }).del();
}

// ── Merged history timeline ──────────────────────────────────
// Combines maintenance, repairs and fuel into one list, newest first.
// Each item shares a common shape so the UI can render them uniformly.
async function history(vehicleId) {
  await vehicleService.getById(vehicleId);

  const [maintenance, repairs, fuel] = await Promise.all([
    db('maintenance_logs').where({ vehicle_id: vehicleId }),
    db('repairs').where({ vehicle_id: vehicleId }),
    db('fuel_logs').where({ vehicle_id: vehicleId }),
  ]);

  const items = [];

  for (const m of maintenance) {
    items.push({
      kind: 'maintenance',
      id: m.id,
      date: m.date,
      title: m.service_type || 'Maintenance',
      cost: m.cost,
      odometer_km: m.odometer_km,
      notes: m.notes,
    });
  }
  for (const r of repairs) {
    items.push({
      kind: 'repair',
      id: r.id,
      date: r.date,
      title: r.reason || 'Repair',
      cost: r.cost,
      is_major: r.is_major,
      cause_of_damage: r.cause_of_damage,
      notes: r.notes,
    });
  }
  for (const f of fuel) {
    items.push({
      kind: 'fuel',
      id: f.id,
      date: f.date,
      title: 'Fuel',
      cost: f.amount_spent,
      litres: f.litres,
      odometer_km: f.odometer_km,
      estimated_km: f.estimated_km,
    });
  }

  // Sort newest first; undated entries sink to the bottom.
  items.sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
  });

  return items;
}

module.exports = {
  listByVehicle,
  getOne,
  create,
  update,
  remove,
  history,
  getConfig,
};
