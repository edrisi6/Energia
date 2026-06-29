// ─────────────────────────────────────────────────────────────
// Add / Edit vehicle form. Same component for both:
//   /vehicles/new        -> create
//   /vehicles/:id/edit   -> edit (loads the existing vehicle first)
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { vehiclesApi } from '../api/vehicles';
import { documentsApi } from '../api/documents';
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
    label: 'Fuel consumption — actual (L/100km)',
    type: 'number',
  },
  {
    name: 'manufacturer_l_per_100km',
    label: 'Fuel consumption — manufacturer rated (L/100km)',
    type: 'number',
  },
  { name: 'depreciation_rate', label: 'Depreciation rate (0–1)', type: 'number' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

// The three photo/document slots offered on the form.
const DOC_SLOTS = [
  { type: 'rego', label: 'Rego photo' },
  { type: 'vin_plate', label: 'VIN plate photo' },
  { type: 'compliance', label: 'Insurance / Roadworthy / Test report' },
];

export default function VehicleForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState({ depreciation_rate: '0.17' });
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // Files chosen on the form, keyed by slot type; uploaded after the vehicle
  // is saved (we need the vehicle's id first).
  const [files, setFiles] = useState({});

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

      // Upload any chosen photos/documents now that we have the vehicle id.
      for (const slot of DOC_SLOTS) {
        const file = files[slot.type];
        if (file) {
          await documentsApi.upload(saved.id, slot.type, file);
        }
      }

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

        {/* Photos / documents */}
        <div className="space-y-2 border-t border-slate-100 pt-4">
          <h2 className="font-semibold">Photos & documents</h2>
          <p className="text-sm text-slate-500">
            Optional. Images or PDFs, up to 10 MB each.
          </p>
          {DOC_SLOTS.map((slot) => (
            <div key={slot.type}>
              <label className="label" htmlFor={`doc-${slot.type}`}>
                {slot.label}
              </label>
              <input
                id={`doc-${slot.type}`}
                type="file"
                accept="image/*,application/pdf"
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-brand-700"
                onChange={(e) =>
                  setFiles((prev) => ({
                    ...prev,
                    [slot.type]: e.target.files?.[0] || undefined,
                  }))
                }
              />
            </div>
          ))}
          {isEdit && (
            <p className="text-xs text-slate-400">
              Tip: you can also view, add and remove files from the vehicle's
              Documents tab.
            </p>
          )}
        </div>

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
