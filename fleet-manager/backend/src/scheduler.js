// ─────────────────────────────────────────────────────────────
// A tiny, dependency-free daily scheduler.
//
// It runs the reminder recompute once shortly after startup, then every 24
// hours. This is the "scheduled daily job" from the spec. Kept simple on
// purpose — for a single self-hosted server this is plenty. (If you later run
// multiple server instances, move this to a real cron/queue so it runs once.)
// ─────────────────────────────────────────────────────────────
const reminderService = require('./services/reminderService');

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

async function runReminderJob() {
  try {
    const count = await reminderService.persistAll();
    // eslint-disable-next-line no-console
    console.log(`🔔 Reminder job: recomputed ${count} reminders.`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Reminder job failed:', err.message);
  }
}

function startScheduler() {
  // Run shortly after boot (gives the DB a moment), then daily.
  const startTimer = setTimeout(runReminderJob, 5000);
  const dailyTimer = setInterval(runReminderJob, ONE_DAY_MS);

  // Don't keep the process alive just for these timers.
  startTimer.unref?.();
  dailyTimer.unref?.();

  return () => {
    clearTimeout(startTimer);
    clearInterval(dailyTimer);
  };
}

module.exports = { startScheduler, runReminderJob };
