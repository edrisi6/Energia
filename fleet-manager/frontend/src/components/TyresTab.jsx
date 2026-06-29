// ─────────────────────────────────────────────────────────────
// Tyres tab: a wear/status banner for the current set, plus the tyre records
// list (add a new set when you change tyres).
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { recordsApi } from '../api/records';
import RecordSection from './RecordSection';
import Spinner from './Spinner';

function TyreStatus({ status }) {
  if (!status.hasTyres) {
    return (
      <div className="card bg-slate-50 p-3 text-sm text-slate-500">
        No tyre set recorded yet. Add one below (brand, rated km and the
        odometer when fitted) to track wear.
      </div>
    );
  }
  if (!status.canCompute) {
    return (
      <div className="card bg-slate-50 p-3 text-sm text-slate-500">
        Add the vehicle's current odometer and a rated lifespan to see tyre
        wear.
      </div>
    );
  }

  const map = {
    due: { box: 'border-red-200 bg-red-50', title: 'text-red-700', bar: 'bg-red-500', label: '🔴 Tyres due for replacement' },
    due_soon: { box: 'border-amber-200 bg-amber-50', title: 'text-amber-700', bar: 'bg-amber-500', label: '🟠 Tyres wearing — replace soon' },
    ok: { box: 'border-emerald-200 bg-emerald-50', title: 'text-emerald-700', bar: 'bg-emerald-500', label: '🟢 Tyres OK' },
  };
  const s = map[status.status] || map.ok;

  return (
    <div className={`rounded-2xl border p-4 ${s.box}`}>
      <div className={`font-semibold ${s.title}`}>{s.label}</div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white">
        <div
          className={`h-full ${s.bar}`}
          style={{ width: `${status.wearPercent}%` }}
        />
      </div>
      <div className="mt-1 text-sm text-slate-600">
        {status.wearPercent}% worn · {status.kmUsed.toLocaleString()} km used of{' '}
        {status.ratedLifespanKm.toLocaleString()} km rated ·{' '}
        {Math.max(0, status.remainingKm).toLocaleString()} km remaining
      </div>
    </div>
  );
}

export default function TyresTab({ vehicleId, vehicleLabel }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    setStatus(null);
    recordsApi
      .tyreStatus(vehicleId)
      .then(setStatus)
      .catch(() => setStatus({ hasTyres: false }));
  }, [vehicleId]);

  return (
    <div className="space-y-5">
      {status ? <TyreStatus status={status} /> : <Spinner />}
      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Tyre history
        </h3>
        <RecordSection vehicleId={vehicleId} type="tyre" vehicleLabel={vehicleLabel} />
      </div>
    </div>
  );
}
