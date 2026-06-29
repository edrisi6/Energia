// ─────────────────────────────────────────────────────────────
// Initial database schema for the Vehicle Fleet Manager.
//
// We create the COMPLETE schema here in one migration. The data model is
// fully specified up front, so creating every table now avoids rewriting
// migrations in later phases. Later phases add API endpoints and logic on
// top of these tables — they generally won't need schema changes.
//
// This file works on both SQLite (dev) and PostgreSQL (prod): we only use
// column types and helpers that Knex translates correctly for both.
// ─────────────────────────────────────────────────────────────

/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  // ── users ───────────────────────────────────────────────────
  // role is one of: 'owner' | 'manager' | 'service_operator'
  // failed_attempts + locked_until power the lockout feature.
  await knex.schema.createTable('users', (t) => {
    t.increments('id').primary();
    t.string('name').notNullable();
    t.string('username').notNullable().unique();
    t.string('pin_hash').notNullable(); // bcrypt hash — never the raw PIN
    t.string('role').notNullable().defaultTo('service_operator');
    t.integer('failed_attempts').notNullable().defaultTo(0);
    t.timestamp('locked_until').nullable(); // when set & in the future = locked
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // ── vehicles ────────────────────────────────────────────────
  await knex.schema.createTable('vehicles', (t) => {
    t.increments('id').primary();
    t.string('make').notNullable();
    t.string('model').notNullable();
    t.integer('year');
    t.string('engine_size');
    t.string('fuel_type');
    t.string('rego_number');
    t.string('vin');
    t.decimal('purchase_price', 14, 2);
    t.date('purchase_date');
    t.decimal('current_value', 14, 2);
    t.decimal('current_odometer_km', 14, 2).defaultTo(0);
    t.decimal('fuel_consumption_l_per_100km', 8, 2);
    t.decimal('depreciation_rate', 6, 4).defaultTo(0.17);
    t.text('notes');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // ── registration_records ────────────────────────────────────
  await knex.schema.createTable('registration_records', (t) => {
    t.increments('id').primary();
    t.integer('vehicle_id')
      .notNullable()
      .references('id')
      .inTable('vehicles')
      .onDelete('CASCADE');
    t.string('authority');
    t.decimal('cost', 14, 2);
    t.date('issue_date');
    t.date('expiry_date');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // ── insurance_records ───────────────────────────────────────
  await knex.schema.createTable('insurance_records', (t) => {
    t.increments('id').primary();
    t.integer('vehicle_id')
      .notNullable()
      .references('id')
      .inTable('vehicles')
      .onDelete('CASCADE');
    t.string('provider');
    t.string('policy_number');
    t.decimal('premium', 14, 2);
    t.date('start_date');
    t.date('expiry_date');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // ── roadworthiness_records ──────────────────────────────────
  await knex.schema.createTable('roadworthiness_records', (t) => {
    t.increments('id').primary();
    t.integer('vehicle_id')
      .notNullable()
      .references('id')
      .inTable('vehicles')
      .onDelete('CASCADE');
    t.date('inspection_date');
    t.date('expiry_date');
    t.boolean('passed').defaultTo(false);
    t.text('notes');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // ── maintenance_logs ────────────────────────────────────────
  await knex.schema.createTable('maintenance_logs', (t) => {
    t.increments('id').primary();
    t.integer('vehicle_id')
      .notNullable()
      .references('id')
      .inTable('vehicles')
      .onDelete('CASCADE');
    t.date('date');
    t.decimal('odometer_km', 14, 2);
    t.string('service_type');
    t.decimal('cost', 14, 2);
    t.text('notes');
    t.decimal('next_due_km', 14, 2);
    t.date('next_due_date');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // ── repairs ─────────────────────────────────────────────────
  await knex.schema.createTable('repairs', (t) => {
    t.increments('id').primary();
    t.integer('vehicle_id')
      .notNullable()
      .references('id')
      .inTable('vehicles')
      .onDelete('CASCADE');
    t.date('date');
    t.decimal('cost', 14, 2);
    t.string('reason');
    t.string('cause_of_damage');
    t.integer('driver_user_id')
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    t.boolean('is_major').defaultTo(false);
    t.text('notes');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // ── fuel_logs ───────────────────────────────────────────────
  await knex.schema.createTable('fuel_logs', (t) => {
    t.increments('id').primary();
    t.integer('vehicle_id')
      .notNullable()
      .references('id')
      .inTable('vehicles')
      .onDelete('CASCADE');
    t.date('date');
    t.decimal('amount_spent', 14, 2);
    t.decimal('price_per_litre', 10, 3);
    t.decimal('litres', 12, 3);
    t.decimal('odometer_km', 14, 2);
    t.decimal('estimated_km', 14, 2); // computed from money + consumption
    t.integer('driver_user_id')
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // ── service_rules ───────────────────────────────────────────
  await knex.schema.createTable('service_rules', (t) => {
    t.increments('id').primary();
    t.integer('vehicle_id')
      .notNullable()
      .references('id')
      .inTable('vehicles')
      .onDelete('CASCADE');
    t.decimal('interval_km', 14, 2);
    t.integer('interval_months');
    t.boolean('use_fuel_estimate').defaultTo(false);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // ── reminders ───────────────────────────────────────────────
  // type: 'registration' | 'insurance' | 'roadworthy' | 'service'
  // status: 'upcoming' | 'due' | 'overdue' | 'done'
  await knex.schema.createTable('reminders', (t) => {
    t.increments('id').primary();
    t.integer('vehicle_id')
      .notNullable()
      .references('id')
      .inTable('vehicles')
      .onDelete('CASCADE');
    t.string('type').notNullable();
    t.date('due_date');
    t.string('status').notNullable().defaultTo('upcoming');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
};

/** @param {import('knex').Knex} knex */
exports.down = async function down(knex) {
  // Drop in reverse dependency order so foreign keys don't block us.
  await knex.schema.dropTableIfExists('reminders');
  await knex.schema.dropTableIfExists('service_rules');
  await knex.schema.dropTableIfExists('fuel_logs');
  await knex.schema.dropTableIfExists('repairs');
  await knex.schema.dropTableIfExists('maintenance_logs');
  await knex.schema.dropTableIfExists('roadworthiness_records');
  await knex.schema.dropTableIfExists('insurance_records');
  await knex.schema.dropTableIfExists('registration_records');
  await knex.schema.dropTableIfExists('vehicles');
  await knex.schema.dropTableIfExists('users');
};
