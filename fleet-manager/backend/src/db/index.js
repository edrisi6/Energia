// ─────────────────────────────────────────────────────────────
// Creates and exports a single shared Knex instance for the whole app.
// Import this anywhere you need to talk to the database:
//   const db = require('../db');
//   await db('users').where({ username }).first();
// ─────────────────────────────────────────────────────────────
const knex = require('knex');
const buildKnexConfig = require('./knex');

const db = knex(buildKnexConfig());

module.exports = db;
