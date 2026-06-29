// ─────────────────────────────────────────────────────────────
// Calendar route: generates a downloadable .ics file for any event.
//   GET /api/calendar/event.ics?title=...&date=YYYY-MM-DD&description=...
// The "Add to calendar" buttons in the UI call this (with the auth token) and
// trigger a file download.
// ─────────────────────────────────────────────────────────────
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { buildIcsEvent } = require('../utils/ics');

const router = express.Router();

router.get('/event.ics', requireAuth, (req, res, next) => {
  try {
    const { title, date, description, uid } = req.query;
    if (!title || !date) {
      return res.status(400).json({ error: 'title and date are required.' });
    }
    const ics = buildIcsEvent({ title, date, description, uid });

    // Build a safe filename from the title.
    const safe = String(title).replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safe}.ics"`);
    res.send(ics);
  } catch (err) {
    if (err.message === 'Invalid event date.') {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

module.exports = router;
