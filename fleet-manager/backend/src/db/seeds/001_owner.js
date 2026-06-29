// ─────────────────────────────────────────────────────────────
// Seed: create the first Owner account.
// The PIN is read from the OWNER_PIN environment variable and hashed with
// bcrypt before insert — the raw PIN is never written to the database.
//
// This seed is idempotent: if the owner username already exists, it does
// nothing (so re-running setup won't create duplicates or reset the PIN).
// ─────────────────────────────────────────────────────────────
const config = require('../../config');
const { validatePin, hashPin } = require('../../utils/pin');
const { ROLES } = require('../../utils/roles');

/** @param {import('knex').Knex} knex */
exports.seed = async function seed(knex) {
  const { name, username, pin } = config.seedOwner;

  if (!pin) {
    throw new Error(
      'OWNER_PIN is not set. Add it to your .env file before seeding.'
    );
  }

  const check = validatePin(pin);
  if (!check.ok) {
    throw new Error(`OWNER_PIN is invalid: ${check.message}`);
  }

  const existing = await knex('users').where({ username }).first();
  if (existing) {
    // eslint-disable-next-line no-console
    console.log(`Owner "${username}" already exists — skipping seed.`);
    return;
  }

  const pin_hash = await hashPin(pin);

  await knex('users').insert({
    name,
    username,
    pin_hash,
    role: ROLES.OWNER,
  });

  // eslint-disable-next-line no-console
  console.log(
    `✅ Created owner account "${username}". ` +
      'Log in and change the PIN as soon as possible.'
  );
};
