// ─────────────────────────────────────────────────────────────
// Maintenance tab. Combines three things:
//   1. A "service due?" status banner (from the backend engine).
//   2. Service rules management (owners/managers set intervals).
//   3. The maintenance log records themselves.
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { recordsApi } from '../api/records';
import RecordSection from './RecordSection';
import Spinner from './Spinner';

function ServiceStatus({ status }) {
  if (!status.hasRules) {
    return (
      <div className="card bg-slate-50 p-3 text-sm text-slate-500">
        No service rules set yet. Add one below to track when a service is due.
      </div>
    );
  }

  if (status.due) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
        <div className="font-semibold text-red-700">🔴 Service due</div>
        <ul className="mt-1 list-disc pl-5 text-sm text-red-600">
          {status.reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="font-semibold text-emerald-700">🟢 No service due</div>
      <div className="mt-1 text-sm text-emerald-600">
        {status.metrics.kmTravelled != null &&
          `${Math.round(status.metrics.kmTravelled)} km since last service. `}
        {status.metrics.monthsElapsed != null &&
          `${status.metrics.monthsElapsed} months elapsed.`}
      </div>
    </div>
  );
}

export default function MaintenanceTab({ vehicleId, vehicleLabel }) {
  const [status, setStatus] = useState(null);

  // We reload the status whenever the tab mounts. (Adding rules/maintenance
  // happens in the sections below; a tab switch will refresh it.)
  useEffect(() => {
    setStatus(null);
    recordsApi
      .serviceStatus(vehicleId)
      .then(setStatus)
      .catch(() => setStatus({ hasRules: false, due: false, reasons: [], metrics: {} }));
  }, [vehicleId]);

  return (
    <div className="space-y-5">
      {status ? <ServiceStatus status={status} /> : <Spinner />}

      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Service rules
        </h3>
        <RecordSection vehicleId={vehicleId} type="serviceRule" />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Maintenance log
        </h3>
        <RecordSection
          vehicleId={vehicleId}
          type="maintenance"
          vehicleLabel={vehicleLabel}
        />
      </div>
    </div>
  );
}
