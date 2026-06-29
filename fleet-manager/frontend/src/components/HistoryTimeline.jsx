// ─────────────────────────────────────────────────────────────
// The merged history log: maintenance + repairs + fuel for a vehicle, newest
// first, on a single timeline. Read-only — entries are added from their own
// tabs.
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { recordsApi } from '../api/records';
import { money, date, km } from '../utils/format';
import Spinner from './Spinner';

// Visual style per entry kind.
const KIND = {
  maintenance: { icon: '🔧', label: 'Maintenance', color: 'bg-blue-100 text-blue-700' },
  repair: { icon: '🛠️', label: 'Repair', color: 'bg-amber-100 text-amber-700' },
  fuel: { icon: '⛽', label: 'Fuel', color: 'bg-emerald-100 text-emerald-700' },
};

export default function HistoryTimeline({ vehicleId }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setItems(null);
    recordsApi
      .history(vehicleId)
      .then(setItems)
      .catch((e) => setError(e.message));
  }, [vehicleId]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (items === null) return <Spinner />;

  if (items.length === 0) {
    return (
      <div className="card px-3 py-8 text-center text-sm text-slate-500">
        No history yet. Add maintenance, repairs or fuel and they'll appear here.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const k = KIND[item.kind] || { icon: '•', label: item.kind, color: 'bg-slate-100' };
        return (
          <li key={`${item.kind}-${item.id}`} className="card flex gap-3 p-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${k.color}`}>
              {k.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{item.title}</span>
                {item.cost != null && item.cost !== '' && (
                  <span className="font-semibold">{money(item.cost)}</span>
                )}
              </div>
              <div className="text-sm text-slate-500">
                {date(item.date)} · {k.label}
                {item.odometer_km ? ` · ${km(item.odometer_km)}` : ''}
                {item.litres ? ` · ${item.litres} L` : ''}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
