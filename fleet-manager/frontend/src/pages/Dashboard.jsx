// ─────────────────────────────────────────────────────────────
// Dashboard: the "Attention needed" list (overdue + due-soon reminders) and a
// fleet summary. Each reminder links to its vehicle and offers an
// "Add to calendar" button.
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { vehiclesApi } from '../api/vehicles';
import { remindersApi } from '../api/reminders';
import { money, date } from '../utils/format';
import { downloadIcs } from '../utils/calendar';
import Spinner from '../components/Spinner';

// Colour + label per reminder status.
const STATUS_STYLE = {
  overdue: { badge: 'bg-red-100 text-red-700', dot: '🔴', label: 'Overdue' },
  due: { badge: 'bg-amber-100 text-amber-700', dot: '🟠', label: 'Due soon' },
  upcoming: { badge: 'bg-slate-100 text-slate-600', dot: '🟡', label: 'Upcoming' },
};

function daysText(days) {
  if (days === null || days === undefined) return '';
  if (days < 0) return `${Math.abs(days)} days ago`;
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

function ReminderRow({ r }) {
  const style = STATUS_STYLE[r.status] || STATUS_STYLE.upcoming;

  async function addToCalendar() {
    try {
      await downloadIcs({
        title: `${r.vehicle_label} — ${r.type_label}`,
        date: r.due_date,
        description: (r.reasons || []).join('; '),
        filename: `${r.vehicle_label}-${r.type}.ics`,
      });
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <li className="card flex items-center justify-between gap-2 p-3">
      <Link to={`/vehicles/${r.vehicle_id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span>{style.dot}</span>
          <span className="truncate font-medium">{r.vehicle_label}</span>
        </div>
        <div className="text-sm text-slate-500">
          {r.type_label} · {date(r.due_date)} ({daysText(r.days_until)})
        </div>
      </Link>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className={`rounded-full px-2 py-0.5 text-xs ${style.badge}`}>
          {style.label}
        </span>
        <button
          onClick={addToCalendar}
          className="text-xs text-brand-600 hover:underline"
        >
          📅 Add to calendar
        </button>
      </div>
    </li>
  );
}

export default function Dashboard() {
  const [vehicles, setVehicles] = useState(null);
  const [reminders, setReminders] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    vehiclesApi.list().then(setVehicles).catch((e) => setError(e.message));
    remindersApi.list(true).then(setReminders).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!vehicles || !reminders) return <Spinner />;

  const totalValue = vehicles.reduce(
    (sum, v) => sum + (Number(v.current_value) || 0),
    0
  );

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Attention needed */}
      <section className="space-y-2">
        <h2 className="font-semibold">
          Attention needed
          {reminders.length > 0 && (
            <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
              {reminders.length}
            </span>
          )}
        </h2>
        {reminders.length === 0 ? (
          <div className="card px-3 py-6 text-center text-sm text-emerald-600">
            ✅ All clear — nothing due in the next 30 days.
          </div>
        ) : (
          <ul className="space-y-2">
            {reminders.map((r) => (
              <ReminderRow key={`${r.vehicle_id}-${r.type}`} r={r} />
            ))}
          </ul>
        )}
      </section>

      {/* Fleet summary */}
      <section className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="text-3xl font-bold">{vehicles.length}</div>
          <div className="text-sm text-slate-500">Vehicles</div>
        </div>
        <div className="card p-4">
          <div className="text-3xl font-bold">{money(totalValue)}</div>
          <div className="text-sm text-slate-500">Fleet value</div>
        </div>
      </section>

      <Link to="/vehicles" className="btn-primary w-full">
        View all vehicles
      </Link>
    </div>
  );
}
