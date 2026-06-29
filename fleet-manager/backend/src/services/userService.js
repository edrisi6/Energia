// ─────────────────────────────────────────────────────────────
// User read helpers. Full user management (create/edit/delete) arrives in a
// later phase; for now we expose a safe, read-only list so the UI can offer a
// "driver" dropdown when logging repairs and fuel.
// ─────────────────────────────────────────────────────────────
const db = require('../db');

// Never return pin_hash or lockout internals.
const SAFE_FIELDS = ['id', 'name', 'username', 'role', 'created_at'];

async function list() {
  return db('users').select(SAFE_FIELDS).orderBy('name');
}

module.exports = { list, SAFE_FIELDS };
