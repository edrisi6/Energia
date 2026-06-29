// ─────────────────────────────────────────────────────────────
// Phase 7 schema additions:
//   - vehicles.manufacturer_l_per_100km : the factory-rated fuel consumption,
//     kept separate from the "actual" fuel_consumption_l_per_100km.
//   - vehicle_documents : uploaded photos/PDFs (rego, VIN plate, compliance).
//   - tyre_records : tyre sets with a manufacturer km rating, for the
//     "tyres due for replacement?" calculation.
//   - fuel_logs.source : where a fuel log came from ('manual' now; ready for a
//     future automated petrol-station feed).
//
// This is a NEW migration (additive) so existing databases upgrade cleanly.
// ─────────────────────────────────────────────────────────────

/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.alterTable('vehicles', (t) => {
    t.decimal('manufacturer_l_per_100km', 8, 2);
  });

  await knex.schema.alterTable('fuel_logs', (t) => {
    // 'manual' = entered by a person; future feeds can use other values.
    t.string('source').notNullable().defaultTo('manual');
  });

  // Uploaded documents/photos attached to a vehicle.
  await knex.schema.createTable('vehicle_documents', (t) => {
    t.increments('id').primary();
    t.integer('vehicle_id')
      .notNullable()
      .references('id')
      .inTable('vehicles')
      .onDelete('CASCADE');
    // 'rego' | 'vin_plate' | 'compliance'
    t.string('doc_type').notNullable();
    t.string('original_filename');
    t.string('stored_filename').notNullable(); // the on-disk name (uuid)
    t.string('mime_type');
    t.integer('size_bytes');
    t.integer('uploaded_by')
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // Tyre sets fitted to a vehicle.
  await knex.schema.createTable('tyre_records', (t) => {
    t.increments('id').primary();
    t.integer('vehicle_id')
      .notNullable()
      .references('id')
      .inTable('vehicles')
      .onDelete('CASCADE');
    t.date('fitted_date');
    t.string('brand');
    t.string('tyre_type'); // e.g. size/model "225/45R17 All-season"
    t.decimal('rated_lifespan_km', 14, 2); // manufacturer's expected km
    t.decimal('fitted_odometer_km', 14, 2); // odometer when fitted
    t.text('notes');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
};

/** @param {import('knex').Knex} knex */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('tyre_records');
  await knex.schema.dropTableIfExists('vehicle_documents');
  await knex.schema.alterTable('fuel_logs', (t) => {
    t.dropColumn('source');
  });
  await knex.schema.alterTable('vehicles', (t) => {
    t.dropColumn('manufacturer_l_per_100km');
  });
};
