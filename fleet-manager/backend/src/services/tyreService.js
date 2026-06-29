// ─────────────────────────────────────────────────────────────
// "Are the tyres due for replacement?" engine.
//
// Based on the most recently fitted tyre set: we compare how far the vehicle
// has driven since the tyres were fitted against the manufacturer's rated
// lifespan.
//
//   km_used   = current_odometer - fitted_odometer
//   remaining = rated_lifespan_km - km_used
//   due when km_used >= rated_lifespan_km
//
// We also report a "wear" percentage so the UI can show progress, and flag
// "due soon" at 90% so there's warning before they're fully worn.
// ─────────────────────────────────────────────────────────────
const db = require('../db');
const vehicleService = require('./vehicleService');

async function computeTyreStatus(vehicleId) {
  const vehicle = await vehicleService.getById(vehicleId);

  // Most recently fitted set (by fitted_date, then id).
  const latest = await db('tyre_records')
    .where({ vehicle_id: vehicleId })
    .orderBy([
      { column: 'fitted_date', order: 'desc' },
      { column: 'id', order: 'desc' },
    ])
    .first();

  if (!latest) {
    return { hasTyres: false };
  }

  const rated = Number(latest.rated_lifespan_km) || 0;
  const fittedOdo = Number(latest.fitted_odometer_km) || 0;
  const currentOdo =
    vehicle.current_odometer_km != null
      ? Number(vehicle.current_odometer_km)
      : null;

  // Without a current odometer or a rating we can't compute wear.
  if (currentOdo == null || rated <= 0) {
    return {
      hasTyres: true,
      canCompute: false,
      tyre: latest,
    };
  }

  const kmUsed = Math.max(0, currentOdo - fittedOdo);
  const remaining = rated - kmUsed;
  const wearPercent = Math.min(100, Math.round((kmUsed / rated) * 100));

  let status = 'ok';
  if (kmUsed >= rated) status = 'due';
  else if (wearPercent >= 90) status = 'due_soon';

  return {
    hasTyres: true,
    canCompute: true,
    due: status === 'due',
    status, // 'ok' | 'due_soon' | 'due'
    wearPercent,
    kmUsed: Math.round(kmUsed),
    remainingKm: Math.round(remaining),
    ratedLifespanKm: rated,
    tyre: latest,
  };
}

module.exports = { computeTyreStatus };
