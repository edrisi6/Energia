// ─────────────────────────────────────────────────────────────
// VIN decoder. Given a VIN, looks up the vehicle's details from the free,
// public NHTSA vPIC database (no API key, no cost) and maps them onto our
// vehicle fields — so adding a vehicle can be as little as photographing the
// VIN plate.
//
// Reference: https://vpic.nhtsa.dot.gov/api  (DecodeVinValues returns one flat
// object of decoded attributes).
// ─────────────────────────────────────────────────────────────
const { ValidationError } = require('../utils/validate');

const VPIC_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues';

// Treat vPIC's empty/placeholder values as "no value".
function clean(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s || /^not applicable$/i.test(s) || s === '0') return null;
  return s;
}

function titleCase(s) {
  if (!s) return s;
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Pure mapping from a vPIC result object to our vehicle fields. Exported so it
// can be unit-tested without any network call.
function mapResult(r = {}) {
  const make = titleCase(clean(r.Make));
  const model = clean(r.Model);
  const yearStr = clean(r.ModelYear);
  const year = yearStr && !Number.isNaN(Number(yearStr)) ? Number(yearStr) : null;

  // Build an engine description from displacement + cylinders.
  const parts = [];
  const disp = clean(r.DisplacementL);
  if (disp && !Number.isNaN(Number(disp))) parts.push(`${Number(disp).toFixed(1)}L`);
  const cyl = clean(r.EngineCylinders);
  if (cyl) parts.push(`${cyl}cyl`);
  const engine_size = parts.join(' ') || null;

  // Normalise the most common fuel wording.
  let fuel_type = clean(r.FuelTypePrimary);
  if (fuel_type && /gasoline/i.test(fuel_type)) fuel_type = 'Petrol';

  return {
    make: make || null,
    model: model || null,
    year,
    engine_size,
    fuel_type: fuel_type || null,
    body_class: clean(r.BodyClass),
  };
}

/**
 * Decode a VIN via vPIC.
 * @returns {Promise<{ vin: string, decoded: boolean, fields: object }>}
 */
async function decode(vin) {
  const clean17 = String(vin || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (clean17.length < 11) {
    throw new ValidationError('Enter a VIN (at least 11 characters) to decode.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  let json;
  try {
    const res = await fetch(`${VPIC_URL}/${encodeURIComponent(clean17)}?format=json`, {
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`vPIC returned ${res.status}`);
    json = await res.json();
  } catch (err) {
    throw new ValidationError(
      'VIN lookup is unavailable right now. You can type the details in instead.'
    );
  } finally {
    clearTimeout(timer);
  }

  const result = Array.isArray(json.Results) ? json.Results[0] : null;
  const fields = mapResult(result || {});
  const decoded = Boolean(fields.make || fields.model || fields.year);
  return { vin: clean17, decoded, fields };
}

module.exports = { decode, mapResult };
