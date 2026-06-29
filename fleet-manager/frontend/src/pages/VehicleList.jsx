// ─────────────────────────────────────────────────────────────
// Vehicle list: every vehicle as a tappable card. Owners/managers see an
// "Add vehicle" button; service operators do not (and the API blocks them
// regardless).
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { vehiclesApi } from '../api/vehicles';
import { useAuth } from '../context/AuthContext';
import { dash } from '../utils/format';
import Spinner from '../components/Spinner';

export default function VehicleList() {
  const { canManage } = useAuth();
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vehicles</h1>
        {canManage && (
          <Link to="/vehicles/new" className="btn-primary text-sm">
            + Add vehicle
          </Link>
        )}
      </div>

      {vehicles.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          <p>No vehicles yet.</p>
          {canManage && (
            <Link to="/vehicles/new" className="btn-primary mt-4">
              Add your first vehicle
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {vehicles.map((v) => (
            <li key={v.id}>
              <Link
                to={`/vehicles/${v.id}`}
                className="card flex items-center justify-between p-4 hover:bg-slate-50"
              >
                <div>
                  <div className="font-semibold">
                    {v.make} {v.model}
                  </div>
                  <div className="text-sm text-slate-500">
                    {dash(v.year)} · {dash(v.rego_number)}
                  </div>
                </div>
                <span className="text-slate-300">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
