// ─────────────────────────────────────────────────────────────
// Vehicle detail page with the tab shell asked for in the spec:
//   Overview · History log · Registration · Insurance · Roadworthy ·
//   Maintenance · Repairs · Fuel · Value
//
// Phase 2 fills in the Overview tab with real data. The other tabs are
// placeholders ("coming in Phase 3/4/5") so the structure is in place and
// later phases just drop content in — no re-plumbing needed.
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { vehiclesApi } from '../api/vehicles';
import { useAuth } from '../context/AuthContext';
import { money, km, dash } from '../utils/format';
import Spinner from '../components/Spinner';
import RecordSection from '../components/RecordSection';
import HistoryTimeline from '../components/HistoryTimeline';
import ValueTab from '../components/ValueTab';
import MaintenanceTab from '../components/MaintenanceTab';

const TABS = [
  'Overview',
  'History log',
  'Registration',
  'Insurance',
  'Roadworthy',
  'Maintenance',
  'Repairs',
  'Fuel',
  'Value',
];

// Map each simple record tab to its backend record type. (Maintenance and
// Value have richer custom tabs handled separately below.)
const TAB_RECORD_TYPE = {
  Registration: 'registration',
  Insurance: 'insurance',
  Roadworthy: 'roadworthy',
  Repairs: 'repairs',
  Fuel: 'fuel',
};

function Row({ label, value }) {
  return (
    <div className="flex justify-between border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Overview({ v }) {
  return (
    <div className="card p-4">
      <Row label="Make" value={dash(v.make)} />
      <Row label="Model" value={dash(v.model)} />
      <Row label="Year" value={dash(v.year)} />
      <Row label="Engine size" value={dash(v.engine_size)} />
      <Row label="Fuel type" value={dash(v.fuel_type)} />
      <Row label="Registration" value={dash(v.rego_number)} />
      <Row label="VIN" value={dash(v.vin)} />
      <Row label="Odometer" value={km(v.current_odometer_km)} />
      <Row
        label="Fuel consumption"
        value={
          v.fuel_consumption_l_per_100km
            ? `${v.fuel_consumption_l_per_100km} L/100km`
            : '—'
        }
      />
      <Row label="Purchase price" value={money(v.purchase_price)} />
      <Row label="Current value" value={money(v.current_value)} />
      <Row label="Notes" value={dash(v.notes)} />
    </div>
  );
}

export default function VehicleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canManage } = useAuth();

  const [vehicle, setVehicle] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('Overview');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    vehiclesApi
      .get(id)
      .then(setVehicle)
      .catch((e) => setError(e.message));
  }, [id]);

  async function handleDelete() {
    try {
      await vehiclesApi.remove(id);
      navigate('/vehicles', { replace: true });
    } catch (e) {
      setError(e.message);
    }
  }

  if (error) return <p className="text-red-600">{error}</p>;
  if (!vehicle) return <Spinner />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => navigate('/vehicles')}
            className="text-sm text-slate-400 hover:text-slate-600"
          >
            ‹ Back to vehicles
          </button>
          <h1 className="text-2xl font-bold">
            {vehicle.make} {vehicle.model}
          </h1>
          <p className="text-sm text-slate-500">
            {dash(vehicle.year)} · {dash(vehicle.rego_number)}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => navigate(`/vehicles/${id}/edit`)}
            className="btn-ghost text-sm"
          >
            Edit
          </button>
        )}
      </div>

      {/* Tabs (horizontally scrollable on small screens) */}
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${
                tab === t
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'Overview' && <Overview v={vehicle} />}
      {tab === 'History log' && <HistoryTimeline vehicleId={id} />}
      {tab === 'Maintenance' && <MaintenanceTab vehicleId={id} />}
      {tab === 'Value' && <ValueTab vehicleId={id} />}
      {TAB_RECORD_TYPE[tab] && (
        <RecordSection vehicleId={id} type={TAB_RECORD_TYPE[tab]} />
      )}

      {/* Danger zone: delete (owners/managers only) */}
      {canManage && (
        <div className="card border-red-100 p-4">
          <h3 className="font-semibold text-red-600">Danger zone</h3>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="btn-ghost mt-2 text-red-600"
            >
              Delete this vehicle
            </button>
          ) : (
            <div className="mt-2 space-y-2">
              <p className="text-sm text-slate-600">
                This permanently deletes the vehicle and all its records. Are
                you sure?
              </p>
              <div className="flex gap-2">
                <button onClick={handleDelete} className="btn-danger">
                  Yes, delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
