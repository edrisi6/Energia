// Small display helpers used across the UI.

// Format a number as currency. Falls back to a dash when empty.
export function money(value) {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return num.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

// Format kilometres with a thousands separator.
export function km(value) {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return `${num.toLocaleString()} km`;
}

// Show a value or a dash when it's empty.
export function dash(value) {
  return value === null || value === undefined || value === '' ? '—' : value;
}
