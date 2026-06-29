// ─────────────────────────────────────────────────────────────
// Depreciation & value calculations.
//
//   current_value = purchase_price * (1 - depreciation_rate) ^ years_owned
//
// A manual override (the vehicle's current_value column) ALWAYS takes
// precedence over the computed figure. We also build a small series of points
// (purchase value vs depreciated value over time) for the Value chart.
// ─────────────────────────────────────────────────────────────
const vehicleService = require('./vehicleService');

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

function round2(n) {
  return Math.round(n * 100) / 100;
}

// Depreciated value after `years` at `rate`.
function depreciatedValue(purchasePrice, rate, years) {
  return purchasePrice * (1 - rate) ** years;
}

/**
 * Compute value details + chart series for a vehicle.
 */
async function computeValue(vehicleId) {
  const v = await vehicleService.getById(vehicleId);

  const purchasePrice = Number(v.purchase_price) || 0;
  const rate =
    v.depreciation_rate === null || v.depreciation_rate === undefined
      ? 0.17
      : Number(v.depreciation_rate);

  // Years owned, from the purchase date to now (0 if no date).
  let yearsOwned = 0;
  if (v.purchase_date) {
    const start = new Date(v.purchase_date).getTime();
    if (!Number.isNaN(start)) {
      yearsOwned = Math.max(0, (Date.now() - start) / MS_PER_YEAR);
    }
  }

  const computedValue = round2(depreciatedValue(purchasePrice, rate, yearsOwned));

  // Manual override wins if the user set current_value.
  const hasOverride =
    v.current_value !== null && v.current_value !== undefined && v.current_value !== '';
  const currentValue = hasOverride ? Number(v.current_value) : computedValue;

  // Build the chart series: one point per year from 0 up to at least 6 years
  // (or however long it's been owned, whichever is larger).
  const span = Math.max(6, Math.ceil(yearsOwned));
  const purchaseYear = v.purchase_date
    ? new Date(v.purchase_date).getFullYear()
    : null;

  const series = [];
  for (let age = 0; age <= span; age++) {
    series.push({
      age,
      label: purchaseYear ? String(purchaseYear + age) : `Yr ${age}`,
      purchase: round2(purchasePrice), // flat reference line
      value: round2(depreciatedValue(purchasePrice, rate, age)),
    });
  }

  return {
    purchasePrice: round2(purchasePrice),
    depreciationRate: rate,
    yearsOwned: round2(yearsOwned),
    computedValue,
    currentValue: round2(currentValue),
    isManualOverride: hasOverride,
    series,
  };
}

module.exports = { computeValue, depreciatedValue };
