// ─────────────────────────────────────────────────────────────
// Builds an iCalendar (.ics) file for a single all-day event.
// Works with Google Calendar, Apple Calendar, Outlook, etc. We add an alarm
// so the user gets a heads-up before the date.
// ─────────────────────────────────────────────────────────────
const crypto = require('crypto');

// Escape text per the iCalendar spec (commas, semicolons, newlines).
function escapeText(text = '') {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

// Format a Date as YYYYMMDD (for all-day events).
function toDateValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

// Format a Date as a UTC timestamp YYYYMMDDTHHMMSSZ (for DTSTAMP).
function toStampValue(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Build an .ics string for an all-day event.
 * @param {object} opts
 * @param {string} opts.title    event summary
 * @param {string} opts.date     ISO date (YYYY-MM-DD)
 * @param {string} [opts.description]
 * @param {string} [opts.uid]    stable id (generated if omitted)
 * @param {number} [opts.alarmDaysBefore] reminder lead time (default 14)
 */
function buildIcsEvent({ title, date, description = '', uid, alarmDaysBefore = 14 }) {
  const start = new Date(date);
  if (Number.isNaN(start.getTime())) {
    throw new Error('Invalid event date.');
  }
  // All-day events use DTSTART (date) and DTEND = next day.
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const id = uid || `${crypto.randomUUID()}@fleet-manager`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Fleet Manager//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${id}`,
    `DTSTAMP:${toStampValue(new Date())}`,
    `DTSTART;VALUE=DATE:${toDateValue(start)}`,
    `DTEND;VALUE=DATE:${toDateValue(end)}`,
    `SUMMARY:${escapeText(title)}`,
    description ? `DESCRIPTION:${escapeText(description)}` : null,
    'BEGIN:VALARM',
    `TRIGGER:-P${alarmDaysBefore}D`,
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  // iCalendar lines are separated by CRLF.
  return lines.join('\r\n');
}

module.exports = { buildIcsEvent };
