// ─────────────────────────────────────────────────────────────
// Add / Edit vehicle form. Same component for both:
//   /vehicles/new        -> create
//   /vehicles/:id/edit   -> edit (loads the existing vehicle first)
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { vehiclesApi } from '../api/vehicles';
import Spinner from '../components/Spinner';

// The fields we collect, with labels and input types.
const FIELDS = [
  { name: 'make', label: 'Make', type: 'text', required: true },
  { name: 'model', label: 'Model', type: 'text', required: true },
  { name: 'year', label: 'Year', type: 'number' },
  { name: 'engine_size', label: 'Engine size', type: 'text' },
  { name: 'fuel_type', label: 'Fuel type', type: 'text' },
  { name: 'rego_number', label: 'Registration number', type: 'text' },
  { name: 'vin', label: 'VIN', type: 'text' },
  { name: 'purchase_price', label: 'Purchase price', type: 'number' },
  { name: 'purchase_date', label: 'Purchase date', type: 'date' },
  { name: 'current_value', label: 'Current value (manual override)', type: 'number' },
  { name: 'current_odometer_km', label: 'Current odometer (km)', type: 'number' },
  {
    name: 'fuel_consumption_l_per_100km',
    label: 'Fuel consumption (L/100km)',
    type: 'number',
  },
  { name: 'depreciation_rate', label: 'Depreciation rate (0–1)', type: 'number' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

export default function VehicleForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState({ depreciation_rate: '0.17' });
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // When editing, load the current values into the form.
  useEffect(() => {
    if (!isEdit) return;
    vehiclesApi
      .get(id)
      .then((v) => {
        // Convert nulls to empty strings so inputs stay controlled.
        const clean = {};
        for (const [k, val] of Object.entries(v)) {
          clean[k] = val === null ? '' : val;
        }
        setForm(clean);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const saved = isEdit
        ? await vehiclesApi.update(id, form)
        : await vehiclesApi.create(form);
      navigate(`/vehicles/${saved.id}`, { replace: true });
    } catch (err) {
      setError(err.message || 'Could not save the vehicle.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">
        {isEdit ? 'Edit vehicle' : 'Add vehicle'}
      </h1>

      <form onSubmit={handleSubmit} className="card space-y-4 p-4">
        {FIELDS.map((f) => (
          <div key={f.name}>
            <label className="label" htmlFor={f.name}>
              {f.label}
              {f.required && <span className="text-red-500"> *</span>}
            </label>
            {f.type === 'textarea' ? (
              <textarea
                id={f.name}
                className="input"
                rows={3}
                value={form[f.name] ?? ''}
                onChange={(e) => setField(f.name, e.target.value)}
              />
            ) : (
              <input
                id={f.name}
                className="input"
                type={f.type}
                step={f.type === 'number' ? 'any' : undefined}
                value={form[f.name] ?? ''}
                onChange={(e) => setField(f.name, e.target.value)}
              />
            )}
          </div>
        ))}

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button type="submit" className="btn-primary flex-1" disabled={busy}>
            {busy ? 'Saving…' : 'Save vehicle'}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
