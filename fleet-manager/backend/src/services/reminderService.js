// ─────────────────────────────────────────────────────────────
// Reminder engine.
//
// For every vehicle we look at the latest registration / insurance /
// roadworthy expiry dates and whether a service is due, and turn those into
// reminders with a status:
//   overdue  — the due date has passed
//   due      — due within the next 14 days (needs attention now)
//   upcoming — further out
//
// `computeAll()` returns fresh reminders for the dashboard (always current).
// `persistAll()` additionally writes them to the reminders table — this is
// what the scheduled daily job calls, matching the spec's "daily recompute".
// ─────────────────────────────────────────────────────────────
const db = require('../db');
const serviceDueService = require('./serviceDueService');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Friendly labels for each reminder type.
const TYPE_LABELS = {
  registration: 'Registration renewal',
  insurance: 'Insurance renewal',
  roadworthy: 'Roadworthy inspection',
  service: 'Service due',
};

// Whole days from today (date-only) until `dueDate`. Negative = in the past.
function daysUntil(dueDate) {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / MS_PER_DAY);
}

// Map days-until to a status.
function statusFor(days) {
  if (days === null) return 'upcoming';
  if (days < 0) return 'overdue';
  if (days <= 14) return 'due';
  return 'upcoming';
}

// The 30 / 14 / 1 day alert thresholds asked for in the spec.
function alertLevel(days) {
  if (days === null) return null;
  if (days <= 1) return 1;
  if (days <= 14) return 14;
  if (days <= 30) return 30;
  return null;
}

// Latest expiry date from one of the expiry-bearing record tables.
async function latestExpiry(table, vehicleId) {
  return db(table)
    .where({ vehicle_id: vehicleId })
    .whereNotNull('expiry_date')
    .orderBy('expiry_date', 'desc')
    .first();
}

// Build a single reminder object (not yet persisted).
function makeReminder(vehicle, type, dueDate) {
  const days = daysUntil(dueDate);
  return {
    vehicle_id: vehicle.id,
    vehicle_label: `${vehicle.make} ${vehicle.model}`,
    type,
    type_label: TYPE_LABELS[type],
    due_date: dueDate,
    status: statusFor(days),
    days_until: days,
    alert_level: alertLevel(days),
  };
}

// Compute reminders for one vehicle.
async function computeForVehicle(vehicle) {
  const out = [];

  const reg = await latestExpiry('registration_records', vehicle.id);
  if (reg?.expiry_date) out.push(makeReminder(vehicle, 'registration', reg.expiry_date));

  const ins = await latestExpiry('insurance_records', vehicle.id);
  if (ins?.expiry_date) out.push(makeReminder(vehicle, 'insurance', ins.expiry_date));

  const rw = await latestExpiry('roadworthiness_records', vehicle.id);
  if (rw?.expiry_date) out.push(makeReminder(vehicle, 'roadworthy', rw.expiry_date));

  // Service: if the engine says it's due now, flag it as due today; otherwise
  // use the next_due_date recorded on the most recent maintenance log.
  const svc = await serviceDueService.computeServiceStatus(vehicle.id);
  if (svc.due) {
    const r = makeReminder(vehicle, 'service', new Date().toISOString().slice(0, 10));
    r.status = 'due';
    r.days_until = 0;
    r.reasons = svc.reasons;
    out.push(r);
  } else {
    const next = await db('maintenance_logs')
      .where({ vehicle_id: vehicle.id })
      .whereNotNull('next_due_date')
      .orderBy('next_due_date', 'desc')
      .first();
    if (next?.next_due_date) out.push(makeReminder(vehicle, 'service', next.next_due_date));
  }

  return out;
}

// Compute reminders for ALL vehicles (used by the dashboard — always live).
async function computeAll() {
  const vehicles = await db('vehicles');
  const all = [];
  for (const v of vehicles) {
    const rs = await computeForVehicle(v);
    all.push(...rs);
  }
  // Soonest first; overdue (negative days) naturally sorts to the top.
  all.sort((a, b) => {
    if (a.days_until === null) return 1;
    if (b.days_until === null) return -1;
    return a.days_until - b.days_until;
  });
  return all;
}

// Persist reminders to the table (the daily job + manual recompute use this).
async function persistAll() {
  const reminders = await computeAll();
  await db('reminders').del(); // clear and rewrite
  if (reminders.length) {
    const rows = reminders.map((r) => ({
      vehicle_id: r.vehicle_id,
      type: r.type,
      due_date: r.due_date,
      status: r.status,
    }));
    await db('reminders').insert(rows);
  }
  return reminders.length;
}

module.exports = {
  computeAll,
  computeForVehicle,
  persistAll,
  daysUntil,
  statusFor,
  TYPE_LABELS,
};
