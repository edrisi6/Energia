// ─────────────────────────────────────────────────────────────
// Fuel money → kilometres estimate.
//
//   litres        = amount_spent / price_per_litre
//   estimated_km  = litres * 100 / fuel_consumption_l_per_100km
//
// We only FILL IN values that weren't supplied, so a user can still type exact
// figures and we won't overwrite them. Used when creating/updating fuel logs.
// ─────────────────────────────────────────────────────────────

// Round to a sensible number of decimal places.
function round(value, places = 2) {
  const f = 10 ** places;
  return Math.round(value * f) / f;
}

/**
 * Given a fuel-log row and the vehicle, derive litres and estimated_km when
 * they're missing. Returns a NEW object with the derived fields added.
 * @param {object} fuelRow cleaned fuel-log data (numbers or null)
 * @param {object} vehicle the vehicle (for fuel_consumption_l_per_100km)
 */
function deriveFuelEstimates(fuelRow, vehicle) {
  const out = { ...fuelRow };

  const amount = Number(out.amount_spent);
  const price = Number(out.price_per_litre);
  // Prefer the measured "actual" consumption; fall back to the manufacturer's
  // rated figure if no actual value has been recorded yet.
  const consumption =
    Number(vehicle?.fuel_consumption_l_per_100km) ||
    Number(vehicle?.manufacturer_l_per_100km);

  // 1) litres from money, if litres wasn't given.
  if (
    (out.litres === null || out.litres === undefined) &&
    amount > 0 &&
    price > 0
  ) {
    out.litres = round(amount / price, 3);
  }

  // 2) estimated_km from litres + the vehicle's consumption, if not given.
  const litres = Number(out.litres);
  if (
    (out.estimated_km === null || out.estimated_km === undefined) &&
    litres > 0 &&
    consumption > 0
  ) {
    out.estimated_km = round((litres * 100) / consumption, 1);
  }

  return out;
}

module.exports = { deriveFuelEstimates, round };
