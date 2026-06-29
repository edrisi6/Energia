// ─────────────────────────────────────────────────────────────
// Front-end configuration for each record type: the form fields to show and
// how to summarise a saved record in the list. One generic <RecordSection>
// component reads this, so all six tabs share the same code.
//
// `writeRoles` here only controls whether the "Add/Edit" buttons appear —
// the backend independently enforces the same rules, so hiding a button is
// just a convenience, never the security boundary.
// ─────────────────────────────────────────────────────────────
import { money, date, dash } from '../utils/format';

// Helper to resolve a driver's name from the users list.
function driverName(id, usersById) {
  if (!id) return 'Unassigned';
  const u = usersById?.[id];
  return u ? u.name : `User #${id}`;
}

const MGMT = ['owner', 'manager'];
const ALL = ['owner', 'manager', 'service_operator'];

export const RECORD_TYPES = {
  registration: {
    label: 'Registration',
    writeRoles: MGMT,
    fields: [
      { name: 'authority', label: 'Authority', type: 'text' },
      { name: 'cost', label: 'Cost', type: 'number' },
      { name: 'issue_date', label: 'Issue date', type: 'date' },
      { name: 'expiry_date', label: 'Expiry date', type: 'date' },
    ],
    summary: (r) => ({
      title: dash(r.authority) === '—' ? 'Registration' : r.authority,
      subtitle: `Expires ${date(r.expiry_date)}`,
      right: money(r.cost),
    }),
  },

  insurance: {
    label: 'Insurance',
    writeRoles: MGMT,
    fields: [
      { name: 'provider', label: 'Provider', type: 'text' },
      { name: 'policy_number', label: 'Policy number', type: 'text' },
      { name: 'premium', label: 'Premium', type: 'number' },
      { name: 'start_date', label: 'Start date', type: 'date' },
      { name: 'expiry_date', label: 'Expiry date', type: 'date' },
    ],
    summary: (r) => ({
      title: dash(r.provider) === '—' ? 'Insurance' : r.provider,
      subtitle: `Policy ${dash(r.policy_number)} · expires ${date(r.expiry_date)}`,
      right: money(r.premium),
    }),
  },

  roadworthy: {
    label: 'Roadworthy',
    writeRoles: MGMT,
    fields: [
      { name: 'inspection_date', label: 'Inspection date', type: 'date' },
      { name: 'expiry_date', label: 'Expiry date', type: 'date' },
      { name: 'passed', label: 'Passed inspection', type: 'checkbox' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
    summary: (r) => ({
      title: r.passed ? '✅ Passed' : '❌ Not passed',
      subtitle: `Inspected ${date(r.inspection_date)} · expires ${date(r.expiry_date)}`,
      right: '',
    }),
  },

  maintenance: {
    label: 'Maintenance',
    writeRoles: ALL,
    fields: [
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'service_type', label: 'Service type', type: 'text' },
      { name: 'odometer_km', label: 'Odometer (km)', type: 'number' },
      { name: 'cost', label: 'Cost', type: 'number' },
      { name: 'next_due_km', label: 'Next due (km)', type: 'number' },
      { name: 'next_due_date', label: 'Next due date', type: 'date' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
    summary: (r) => ({
      title: dash(r.service_type) === '—' ? 'Service' : r.service_type,
      subtitle: `${date(r.date)} · ${dash(r.odometer_km)} km`,
      right: money(r.cost),
    }),
  },

  repairs: {
    label: 'Repairs',
    writeRoles: ALL,
    fields: [
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'reason', label: 'Reason', type: 'text' },
      { name: 'cause_of_damage', label: 'Cause of damage', type: 'text' },
      { name: 'cost', label: 'Cost', type: 'number' },
      { name: 'driver_user_id', label: 'Driver', type: 'driver' },
      { name: 'is_major', label: 'Major repair', type: 'checkbox' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
    summary: (r, ctx) => ({
      title:
        (dash(r.reason) === '—' ? 'Repair' : r.reason) +
        (r.is_major ? ' (major)' : ''),
      subtitle: `${date(r.date)} · ${driverName(r.driver_user_id, ctx?.usersById)}`,
      right: money(r.cost),
    }),
  },

  fuel: {
    label: 'Fuel',
    writeRoles: ALL,
    fields: [
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'amount_spent', label: 'Amount spent', type: 'number' },
      { name: 'price_per_litre', label: 'Price per litre', type: 'number' },
      // Litres + estimated km are filled in automatically by the server, so we
      // don't ask for them here. Estimated km is shown on the fuel list/history.
      { name: 'odometer_km', label: 'Odometer (km)', type: 'number' },
      { name: 'driver_user_id', label: 'Driver', type: 'driver' },
    ],
    summary: (r, ctx) => ({
      title: `${dash(r.litres)} L`,
      subtitle:
        `${date(r.date)} · ${driverName(r.driver_user_id, ctx?.usersById)}` +
        (r.estimated_km ? ` · ~${r.estimated_km} km` : ''),
      right: money(r.amount_spent),
    }),
  },

  // Service interval rules (drive the "service due?" engine).
  serviceRule: {
    label: 'Service rule',
    writeRoles: MGMT,
    fields: [
      { name: 'interval_km', label: 'Every (km)', type: 'number' },
      { name: 'interval_months', label: 'Every (months)', type: 'number' },
      { name: 'use_fuel_estimate', label: 'Use fuel-based km estimate', type: 'checkbox' },
    ],
    summary: (r) => ({
      title:
        [
          r.interval_km ? `${r.interval_km} km` : null,
          r.interval_months ? `${r.interval_months} mo` : null,
        ]
          .filter(Boolean)
          .join(' / ') || 'Rule',
      subtitle: r.use_fuel_estimate ? 'Counts fuel-estimated km' : 'Odometer & time',
      right: '',
    }),
  },
};
