// ─────────────────────────────────────────────────────────────
// Dashboard: a fleet summary plus an "Attention needed" area.
// In Phase 2 the attention list is a placeholder — the reminders engine
// that fills it arrives in Phase 5. The fleet summary is real data.
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { vehiclesApi } from '../api/vehicles';
import { money } from '../utils/format';
import Spinner from '../components/Spinner';

export default function Dashboard() {
  const [vehicles, setVehicles] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    vehiclesApi
      .list()
      .then(setVehicles)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!vehicles) return <Spinner />;

  const totalValue = vehicles.reduce(
    (sum, v) => sum + (Number(v.current_value) || 0),
    0
  );

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Attention needed (placeholder until Phase 5 reminders engine) */}
      <section className="card p-4">
        <h2 className="mb-2 font-semibold">Attention needed</h2>
        <div className="rounded-xl bg-amber-50 px-3 py-6 text-center text-sm text-amber-700">
          ⏰ Reminders for registration, insurance, roadworthy and services
          will appear here in Phase 5.
        </div>
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
