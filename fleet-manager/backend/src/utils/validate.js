// ─────────────────────────────────────────────────────────────
// Tiny validation helpers. We keep validation explicit and dependency-free
// so the rules are easy to read and adjust. Each helper returns a cleaned
// value or throws a ValidationError that the error handler turns into a 400.
// ─────────────────────────────────────────────────────────────

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
    this.publicMessage = message;
  }
}

// Required, non-empty string.
function requireString(value, field, { maxLen = 255 } = {}) {
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new ValidationError(`${field} is required.`);
  }
  const str = String(value).trim();
  if (str.length > maxLen) {
    throw new ValidationError(`${field} must be ${maxLen} characters or fewer.`);
  }
  return str;
}

// Optional string -> trimmed string or null.
function optionalString(value, field, { maxLen = 255 } = {}) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }
  const str = String(value).trim();
  if (str.length > maxLen) {
    throw new ValidationError(`${field} must be ${maxLen} characters or fewer.`);
  }
  return str;
}

// Optional number -> number or null. Rejects non-numeric input.
function optionalNumber(value, field, { min, max } = {}) {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  if (Number.isNaN(num)) {
    throw new ValidationError(`${field} must be a number.`);
  }
  if (min !== undefined && num < min) {
    throw new ValidationError(`${field} must be at least ${min}.`);
  }
  if (max !== undefined && num > max) {
    throw new ValidationError(`${field} must be at most ${max}.`);
  }
  return num;
}

// Optional date -> "YYYY-MM-DD" string or null. Accepts anything Date parses.
function optionalDate(value, field) {
  if (value === undefined || value === null || value === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new ValidationError(`${field} must be a valid date.`);
  }
  return d.toISOString().slice(0, 10);
}

// Coerce common truthy/falsy inputs to a real boolean.
function optionalBool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const s = String(value).toLowerCase();
  return s === 'true' || s === '1' || s === 'yes';
}

module.exports = {
  ValidationError,
  requireString,
  optionalString,
  optionalNumber,
  optionalDate,
  optionalBool,
};
