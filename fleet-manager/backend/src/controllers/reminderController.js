// ─────────────────────────────────────────────────────────────
// HTTP layer for reminders.
//   GET  /api/reminders            list reminders (live)
//        ?attention=1              only overdue + within 30 days
//   POST /api/reminders/recompute  rebuild + persist (owner/manager)
// ─────────────────────────────────────────────────────────────
const reminderService = require('../services/reminderService');

async function list(req, res, next) {
  try {
    let reminders = await reminderService.computeAll();

    // ?attention=1 → only the things worth surfacing on the dashboard.
    if (req.query.attention === '1') {
      reminders = reminders.filter(
        (r) => r.status === 'overdue' || r.alert_level !== null
      );
    }

    res.json({ reminders });
  } catch (err) {
    next(err);
  }
}

async function recompute(req, res, next) {
  try {
    const count = await reminderService.persistAll();
    res.json({ ok: true, count });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, recompute };
