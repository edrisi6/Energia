'use strict';
require('dotenv').config();

const express  = require('express');
const webpush  = require('web-push');
const Database = require('better-sqlite3');
const cron     = require('node-cron');
const path     = require('path');

// ── Environment ──────────────────────────────────────────────────
const {
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  VAPID_EMAIL,
  PORT = 3000,
  TZ   = 'Australia/Melbourne',
  DB_PATH = './lamees.db',
} = process.env;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_EMAIL) {
  console.error('Missing VAPID env vars. Run: npm run generate-keys');
  process.exit(1);
}

webpush.setVapidDetails(`mailto:${VAPID_EMAIL}`, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// ── Database ─────────────────────────────────────────────────────
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS subscriptions (
    endpoint   TEXT PRIMARY KEY,
    sub_json   TEXT NOT NULL,
    updated_at INTEGER DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    date            TEXT    NOT NULL,
    slot_hhmm       INTEGER NOT NULL,
    respondent_id   TEXT    NOT NULL,
    respondent_name TEXT    NOT NULL,
    action          TEXT    NOT NULL,
    responded_at    TEXT    NOT NULL,
    responded_at_ms INTEGER NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS log_date_slot ON log(date, slot_hhmm);
  CREATE TABLE IF NOT EXISTS fired_slots (
    date      TEXT    NOT NULL,
    slot_hhmm INTEGER NOT NULL,
    PRIMARY KEY (date, slot_hhmm)
  );
`);

// ── Time helpers (timezone-aware) ────────────────────────────────
const SLOTS = [800, 1000, 1200, 1400, 1600, 1800, 2000, 2200];

function nowInTZ() {
  // Returns { hhmm, iso } for the configured timezone
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const get = t => parts.find(p => p.type === t).value;
  const hhmm = parseInt(get('hour')) * 100 + parseInt(get('minute'));
  const iso  = `${get('year')}-${get('month')}-${get('day')}`;
  return { hhmm, iso };
}

function fmtHHMM(v) {
  return String(Math.floor(v / 100)).padStart(2, '0') + ':' + String(v % 100).padStart(2, '0');
}

// ── Push helpers ─────────────────────────────────────────────────
async function pushToAll(payload) {
  const subs = db.prepare('SELECT endpoint, sub_json FROM subscriptions').all();
  const body = JSON.stringify(payload);
  const dead = [];
  for (const row of subs) {
    try {
      await webpush.sendNotification(JSON.parse(row.sub_json), body);
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) dead.push(row.endpoint);
      else console.error('Push error for', row.endpoint, e.statusCode, e.body);
    }
  }
  if (dead.length) {
    const del = db.prepare('DELETE FROM subscriptions WHERE endpoint = ?');
    dead.forEach(ep => del.run(ep));
    console.log(`Removed ${dead.length} stale subscription(s)`);
  }
}

// ── Slot firing ──────────────────────────────────────────────────
function catchUpFiredSlots() {
  const { hhmm, iso } = nowInTZ();
  const insert = db.prepare('INSERT OR IGNORE INTO fired_slots (date, slot_hhmm) VALUES (?, ?)');
  for (const slot of SLOTS) {
    if (slot < hhmm) insert.run(iso, slot); // past slot — mark silently, no notification
  }
}

async function checkAndFireSlots() {
  const { hhmm, iso } = nowInTZ();
  for (const slot of SLOTS) {
    if (hhmm < slot) continue;
    const already = db.prepare('SELECT 1 FROM fired_slots WHERE date = ? AND slot_hhmm = ?').get(iso, slot);
    if (already) continue;
    db.prepare('INSERT OR IGNORE INTO fired_slots (date, slot_hhmm) VALUES (?, ?)').run(iso, slot);
    console.log(`[${new Date().toISOString()}] Firing slot ${fmtHHMM(slot)}`);
    await pushToAll({
      type: 'reminder',
      slotHHMM: slot,
      title: '🚽 Lamees needs the toilet!',
      body: `${fmtHHMM(slot)} slot — please take Lamees to the toilet. Tap to respond.`,
    });
  }
}

// Mark past slots on startup so we never re-fire after a restart
catchUpFiredSlots();

// ── Express ──────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Expose VAPID public key so the client can subscribe
app.get('/api/vapid-public-key', (_req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// Register or refresh a push subscription from a device
app.post('/api/subscribe', (req, res) => {
  const sub = req.body;
  if (!sub?.endpoint) return res.status(400).json({ error: 'Invalid subscription' });
  db.prepare(`
    INSERT INTO subscriptions (endpoint, sub_json, updated_at)
    VALUES (?, ?, unixepoch())
    ON CONFLICT(endpoint) DO UPDATE SET sub_json = excluded.sub_json, updated_at = unixepoch()
  `).run(sub.endpoint, JSON.stringify(sub));
  res.json({ ok: true });
});

// Record a family member's response to a slot
app.post('/api/respond', async (req, res) => {
  const { slotHHMM, respondentId, respondentName, action, respondedAt, respondedAtMs } = req.body;
  if (!slotHHMM || !respondentId || !action) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const { iso } = nowInTZ();
  try {
    db.prepare(`
      INSERT INTO log (date, slot_hhmm, respondent_id, respondent_name, action, responded_at, responded_at_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(iso, slotHHMM, respondentId, respondentName, action, respondedAt, respondedAtMs);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Already claimed' });
    return res.status(500).json({ error: e.message });
  }
  res.json({ ok: true });
  // Push update to all devices so they dismiss the notification and refresh UI
  pushToAll({ type: 'claimed', slotHHMM, respondentName, action }).catch(console.error);
});

// Today's log and fired slots — single endpoint the client polls
app.get('/api/today', (_req, res) => {
  const { iso } = nowInTZ();
  const log = db.prepare(
    'SELECT * FROM log WHERE date = ? ORDER BY responded_at_ms'
  ).all(iso);
  const firedSlots = db.prepare(
    'SELECT slot_hhmm FROM fired_slots WHERE date = ?'
  ).all(iso).map(r => r.slot_hhmm);
  res.json({ log, firedSlots });
});

// ── Cron: fire slots every minute ───────────────────────────────
cron.schedule('* * * * *', () => {
  checkAndFireSlots().catch(console.error);
});

// ── Start ────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Lamees Care running on port ${PORT} (TZ: ${TZ})`);
});
