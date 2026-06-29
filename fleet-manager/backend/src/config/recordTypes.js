// ─────────────────────────────────────────────────────────────
// Configuration for every "record" attached to a vehicle.
//
// Each record type maps to a database table, the roles allowed to WRITE it,
// and the list of fields with their validation rules. Defining them here once
// lets a single generic service/controller handle all six types — no copy-
// pasted CRUD code per table.
//
// Role rules (from the spec):
//   - Registration / Insurance / Roadworthy: owner + manager only.
//   - Maintenance / Repairs / Fuel: also Service Operators (they do this work).
//   - Everyone authenticated can READ all records.
// ─────────────────────────────────────────────────────────────
const { ROLES } = require('../utils/roles');

const ALL = [ROLES.OWNER, ROLES.MANAGER, ROLES.SERVICE_OPERATOR];
const MGMT_ONLY = [ROLES.OWNER, ROLES.MANAGER];

const RECORD_TYPES = {
  registration: {
    table: 'registration_records',
    writeRoles: MGMT_ONLY,
    fields: [
      { name: 'authority', kind: 'string', label: 'Authority' },
      { name: 'cost', kind: 'number', label: 'Cost', min: 0 },
      { name: 'issue_date', kind: 'date', label: 'Issue date' },
      { name: 'expiry_date', kind: 'date', label: 'Expiry date' },
    ],
  },

  insurance: {
    table: 'insurance_records',
    writeRoles: MGMT_ONLY,
    fields: [
      { name: 'provider', kind: 'string', label: 'Provider' },
      { name: 'policy_number', kind: 'string', label: 'Policy number' },
      { name: 'premium', kind: 'number', label: 'Premium', min: 0 },
      { name: 'start_date', kind: 'date', label: 'Start date' },
      { name: 'expiry_date', kind: 'date', label: 'Expiry date' },
    ],
  },

  roadworthy: {
    table: 'roadworthiness_records',
    writeRoles: MGMT_ONLY,
    fields: [
      { name: 'inspection_date', kind: 'date', label: 'Inspection date' },
      { name: 'expiry_date', kind: 'date', label: 'Expiry date' },
      { name: 'passed', kind: 'bool', label: 'Passed' },
      { name: 'notes', kind: 'string', label: 'Notes', maxLen: 2000 },
    ],
  },

  maintenance: {
    table: 'maintenance_logs',
    writeRoles: ALL,
    fields: [
      { name: 'date', kind: 'date', label: 'Date' },
      { name: 'odometer_km', kind: 'number', label: 'Odometer (km)', min: 0 },
      { name: 'service_type', kind: 'string', label: 'Service type' },
      { name: 'cost', kind: 'number', label: 'Cost', min: 0 },
      { name: 'notes', kind: 'string', label: 'Notes', maxLen: 2000 },
      { name: 'next_due_km', kind: 'number', label: 'Next due (km)', min: 0 },
      { name: 'next_due_date', kind: 'date', label: 'Next due date' },
    ],
  },

  repairs: {
    table: 'repairs',
    writeRoles: ALL,
    fields: [
      { name: 'date', kind: 'date', label: 'Date' },
      { name: 'cost', kind: 'number', label: 'Cost', min: 0 },
      { name: 'reason', kind: 'string', label: 'Reason' },
      { name: 'cause_of_damage', kind: 'string', label: 'Cause of damage' },
      { name: 'driver_user_id', kind: 'fk', label: 'Driver' },
      { name: 'is_major', kind: 'bool', label: 'Major repair' },
      { name: 'notes', kind: 'string', label: 'Notes', maxLen: 2000 },
    ],
  },

  fuel: {
    table: 'fuel_logs',
    writeRoles: ALL,
    fields: [
      { name: 'date', kind: 'date', label: 'Date' },
      { name: 'amount_spent', kind: 'number', label: 'Amount spent', min: 0 },
      { name: 'price_per_litre', kind: 'number', label: 'Price per litre', min: 0 },
      { name: 'litres', kind: 'number', label: 'Litres', min: 0 },
      { name: 'odometer_km', kind: 'number', label: 'Odometer (km)', min: 0 },
      { name: 'estimated_km', kind: 'number', label: 'Estimated km', min: 0 },
      { name: 'driver_user_id', kind: 'fk', label: 'Driver' },
    ],
  },

  // Tyre sets. Logging a new set records the odometer when fitted and the
  // manufacturer's rated lifespan, which drives the "tyres due?" calculation.
  tyre: {
    table: 'tyre_records',
    writeRoles: ALL,
    fields: [
      { name: 'fitted_date', kind: 'date', label: 'Fitted date' },
      { name: 'brand', kind: 'string', label: 'Brand' },
      { name: 'tyre_type', kind: 'string', label: 'Type / size' },
      { name: 'rated_lifespan_km', kind: 'number', label: 'Rated lifespan (km)', min: 0 },
      { name: 'fitted_odometer_km', kind: 'number', label: 'Odometer when fitted (km)', min: 0 },
      { name: 'notes', kind: 'string', label: 'Notes', maxLen: 2000 },
    ],
  },

  // Service rules drive the "is a service due?" engine. A vehicle can have
  // several; a service is due if ANY rule is met. Owners/managers only.
  serviceRule: {
    table: 'service_rules',
    writeRoles: MGMT_ONLY,
    fields: [
      { name: 'interval_km', kind: 'number', label: 'Every (km)', min: 0 },
      { name: 'interval_months', kind: 'number', label: 'Every (months)', min: 0 },
      { name: 'use_fuel_estimate', kind: 'bool', label: 'Use fuel-based km estimate' },
    ],
  },
};

module.exports = { RECORD_TYPES };
