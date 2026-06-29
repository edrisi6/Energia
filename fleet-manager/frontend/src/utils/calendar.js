// ─────────────────────────────────────────────────────────────
// "Add to calendar" helper. Asks the backend to generate an .ics file (with
// the auth token), then triggers a browser download. The downloaded file can
// be opened in Google / Apple / Outlook calendar.
// ─────────────────────────────────────────────────────────────
import { getToken } from '../api/client';

export async function downloadIcs({ title, date, description = '', filename }) {
  const params = new URLSearchParams({ title, date, description });
  const res = await fetch(`/api/calendar/event.ics?${params.toString()}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Could not generate the calendar file.');

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'event.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
