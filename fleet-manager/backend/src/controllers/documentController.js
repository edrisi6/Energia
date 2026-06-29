// ─────────────────────────────────────────────────────────────
// HTTP layer for vehicle documents/photos.
// ─────────────────────────────────────────────────────────────
const fs = require('fs');
const documentService = require('../services/documentService');

async function list(req, res, next) {
  try {
    const documents = await documentService.list(req.params.vehicleId);
    res.json({ documents });
  } catch (err) {
    next(err);
  }
}

async function upload(req, res, next) {
  try {
    const docType = req.body.doc_type;
    const document = await documentService.create(
      req.params.vehicleId,
      docType,
      req.file, // provided by multer
      req.user.id
    );
    res.status(201).json({ document });
  } catch (err) {
    next(err);
  }
}

// Streams the actual file back (inline so images/PDFs preview in the browser).
async function download(req, res, next) {
  try {
    const { path: filePath, row } = await documentService.getFile(
      req.params.vehicleId,
      req.params.docId
    );
    res.setHeader('Content-Type', row.mime_type || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${row.original_filename || 'document'}"`
    );
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await documentService.remove(req.params.vehicleId, req.params.docId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, upload, download, remove };
