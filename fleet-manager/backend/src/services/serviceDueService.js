// ─────────────────────────────────────────────────────────────
// "Is a service due?" engine.
//
// A service is due if ANY service rule is met since the last maintenance:
//   (a) kilometres travelled        >= interval_km
//   (b) months elapsed              >= interval_months
//   (c) (if use_fuel_estimate) the summed estimated_km from fuel logs
//                                   >= interval_km
// Whichever triggers first wins. We return rich detail so the UI can explain
// *why* something is due.
// ─────────────────────────────────────────────────────────────
const db = require('../db');
const vehicleService = require('./vehicleService');

const MS_PER_MONTH = (365.25 / 12) * 24 * 60 * 60 * 1000;

function monthsBetween(fromDate, toDate = new Date()) {
  const from = new Date(fromDate).getTime();
  if (Number.isNaN(from)) return null;
  return (toDate.getTime() - from) / MS_PER_MONTH;
}

/**
 * Compute service status for a vehicle.
 * @returns {Promise<object>} { due, reasons, baseline, metrics, rules }
 */
async function computeServiceStatus(vehicleId) {
  const vehicle = await vehicleService.getById(vehicleId);

  const rules = await db('service_rules').where({ vehicle_id: vehicleId });

  // The baseline is the most recent maintenance. If there's none yet, fall
  // back to the vehicle's purchase (date + odometer 0) so we can still measure.
  const lastService = await db('maintenance_logs')
    .where({ vehicle_id: vehicleId })
    .whereNotNull('date')
    .orderBy('date', 'desc')
    .first();

  const baselineDate = lastService?.date || vehicle.purchase_date || null;
  const baselineOdo =
    lastService?.odometer_km != null ? Number(lastService.odometer_km) : 0;

  const currentOdo =
    vehicle.current_odometer_km != null
      ? Number(vehicle.current_odometer_km)
      : null;

  // Metrics since baseline.
  const kmTravelled =
    currentOdo != null ? Math.max(0, currentOdo - baselineOdo) : null;
  const monthsElapsed = baselineDate ? monthsBetween(baselineDate) : null;

  // Sum of fuel-based estimated_km since the baseline date.
  let fuelEstimatedKm = 0;
  const fuelQuery = db('fuel_logs').where({ vehicle_id: vehicleId });
  if (baselineDate) fuelQuery.andWhere('date', '>=', baselineDate);
  const fuelLogs = await fuelQuery;
  for (const f of fuelLogs) fuelEstimatedKm += Number(f.estimated_km) || 0;
  fuelEstimatedKm = Math.round(fuelEstimatedKm * 10) / 10;

  // Evaluate every rule.
  const reasons = [];
  const ruleResults = rules.map((rule) => {
    const triggers = [];

    if (rule.interval_km != null && kmTravelled != null) {
      if (kmTravelled >= Number(rule.interval_km)) {
        triggers.push(
          `Travelled ${Math.round(kmTravelled)} km (limit ${rule.interval_km} km)`
        );
      }
    }
    if (rule.interval_months != null && monthsElapsed != null) {
      if (monthsElapsed >= Number(rule.interval_months)) {
        triggers.push(
          `${monthsElapsed.toFixed(1)} months elapsed (limit ${rule.interval_months})`
        );
      }
    }
    if (rule.use_fuel_estimate && rule.interval_km != null) {
      if (fuelEstimatedKm >= Number(rule.interval_km)) {
        triggers.push(
          `Fuel-estimated ${fuelEstimatedKm} km (limit ${rule.interval_km} km)`
        );
      }
    }

    if (triggers.length) reasons.push(...triggers);
    return { rule, met: triggers.length > 0, triggers };
  });

  const due = ruleResults.some((r) => r.met);

  return {
    due,
    reasons,
    hasRules: rules.length > 0,
    baseline: {
      date: baselineDate,
      odometer_km: baselineOdo,
      source: lastService ? 'last_service' : 'purchase',
    },
    metrics: {
      kmTravelled,
      monthsElapsed:
        monthsElapsed == null ? null : Math.round(monthsElapsed * 10) / 10,
      fuelEstimatedKm,
      currentOdometer: currentOdo,
    },
    rules: ruleResults,
  };
}

module.exports = { computeServiceStatus };
