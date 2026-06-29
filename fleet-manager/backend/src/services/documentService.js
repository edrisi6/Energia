// ─────────────────────────────────────────────────────────────
// Vehicle document/photo storage.
// Files are saved to disk (config.uploads.dir) with a random name; the
// database keeps the metadata. Access is always through the API (with a valid
// token) — files are never served as public static assets, since they include
// sensitive things like insurance certificates and VIN plates.
// ─────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const db = require('../db');
const config = require('../config');
const vehicleService = require('./vehicleService');
const { ValidationError } = require('../utils/validate');

// The three document slots a vehicle can have.
const DOC_TYPES = ['rego', 'vin_plate', 'compliance'];

const DOC_TYPE_LABELS = {
  rego: 'Registration',
  vin_plate: 'VIN plate',
  compliance: 'Compliance document',
};

// Ensure the uploads directory exists.
function ensureDir() {
  fs.mkdirSync(config.uploads.dir, { recursive: true });
}

// Public-safe view of a document row (no disk path).
function publicDoc(row) {
  return {
    id: row.id,
    vehicle_id: row.vehicle_id,
    doc_type: row.doc_type,
    doc_type_label: DOC_TYPE_LABELS[row.doc_type] || row.doc_type,
    original_filename: row.original_filename,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    created_at: row.created_at,
  };
}

async function list(vehicleId) {
  await vehicleService.getById(vehicleId);
  const rows = await db('vehicle_documents')
    .where({ vehicle_id: vehicleId })
    .orderBy('id', 'desc');
  return rows.map(publicDoc);
}

// Save an uploaded file (from multer's memory buffer) for a vehicle.
async function create(vehicleId, docType, file, userId) {
  await vehicleService.getById(vehicleId);

  if (!DOC_TYPES.includes(docType)) {
    throw new ValidationError(
      `doc_type must be one of: ${DOC_TYPES.join(', ')}.`
    );
  }
  if (!file) throw new ValidationError('A file is required.');

  ensureDir();

  // Random on-disk name, keep the original extension.
  const ext = path.extname(file.originalname || '').slice(0, 10);
  const stored = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const fullPath = path.join(config.uploads.dir, stored);

  fs.writeFileSync(fullPath, file.buffer);

  const [row] = await db('vehicle_documents')
    .insert({
      vehicle_id: Number(vehicleId),
      doc_type: docType,
      original_filename: file.originalname,
      stored_filename: stored,
      mime_type: file.mimetype,
      size_bytes: file.size,
      uploaded_by: userId || null,
    })
    .returning('*');

  const saved = row && typeof row === 'object'
    ? row
    : await db('vehicle_documents').where({ id: row }).first();
  return publicDoc(saved);
}

// Get the raw file (path + metadata) for streaming/download.
async function getFile(vehicleId, docId) {
  const row = await db('vehicle_documents')
    .where({ id: docId, vehicle_id: vehicleId })
    .first();
  if (!row) throw new ValidationError('Document not found.');

  const fullPath = path.join(config.uploads.dir, row.stored_filename);
  if (!fs.existsSync(fullPath)) {
    throw new ValidationError('The file is missing from storage.');
  }
  return { path: fullPath, row };
}

async function remove(vehicleId, docId) {
  const row = await db('vehicle_documents')
    .where({ id: docId, vehicle_id: vehicleId })
    .first();
  if (!row) throw new ValidationError('Document not found.');

  // Remove the file from disk (ignore if already gone), then the DB row.
  const fullPath = path.join(config.uploads.dir, row.stored_filename);
  try {
    fs.unlinkSync(fullPath);
  } catch {
    /* file already missing — fine */
  }
  await db('vehicle_documents').where({ id: docId }).del();
}

module.exports = { list, create, getFile, remove, DOC_TYPES, DOC_TYPE_LABELS };
