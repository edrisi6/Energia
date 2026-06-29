// ─────────────────────────────────────────────────────────────
// Add / Edit vehicle form. Same component for both:
//   /vehicles/new        -> create
//   /vehicles/:id/edit   -> edit (loads the existing vehicle first)
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { vehiclesApi } from '../api/vehicles';
import { documentsApi } from '../api/documents';
import { aiApi } from '../api/ai';
import { vinApi } from '../api/vin';
import PhotoField from '../components/PhotoField';
import Spinner from '../components/Spinner';

// The fields we collect, with labels and input types.
const FIELDS = [
  { name: 'make', label: 'Make', type: 'text', required: true },
  { name: 'model', label: 'Model', type: 'text', required: true },
  { name: 'year', label: 'Year', type: 'number' },
  { name: 'engine_size', label: 'Engine size', type: 'text' },
  { name: 'fuel_type', label: 'Fuel type', type: 'text' },
  { name: 'rego_number', label: 'Registration number', type: 'text' },
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
  // Whether cloud AI scanning is available (set by the server admin).
  const [aiEnabled, setAiEnabled] = useState(false);
  // VIN-decode status + busy flags for the "start with the VIN" flow.
  const [vinStatus, setVinStatus] = useState('');
  const [vinBusy, setVinBusy] = useState(false);
  const [enrichBusy, setEnrichBusy] = useState(false);

  useEffect(() => {
    aiApi.status().then((s) => setAiEnabled(Boolean(s.enabled))).catch(() => {});
  }, []);

  // Decode a VIN and auto-fill make/model/year/engine/fuel.
  async function decodeAndFill(vin) {
    if (!vin || vin.replace(/[^a-z0-9]/gi, '').length < 11) {
      setVinStatus('Enter or scan a VIN first.');
      return;
    }
    setVinBusy(true);
    setVinStatus('Looking up the VIN…');
    try {
      const r = await vinApi.decode(vin);
      setField('vin', r.vin);
      if (!r.decoded) {
        setVinStatus("Couldn't find details for that VIN — you can type them in below.");
        return;
      }
      const f = r.fields;
      const filled = [];
      if (f.make) { setField('make', f.make); filled.push(f.make); }
      if (f.model) { setField('model', f.model); filled.push(f.model); }
      if (f.year) { setField('year', String(f.year)); filled.push(f.year); }
      if (f.engine_size) setField('engine_size', f.engine_size);
      if (f.fuel_type) setField('fuel_type', f.fuel_type);
      setVinStatus(
        `✅ Filled in: ${filled.join(' ')}. Review the details below and save.`
      );
    } catch (e) {
      setVinStatus(e.message || 'VIN lookup failed.');
    } finally {
      setVinBusy(false);
    }
  }

  // Called when the VIN was read off a photo — decode automatically.
  function onVinScanned(v) {
    if (v.vin) {
      setField('vin', v.vin);
      decodeAndFill(v.vin);
    }
  }

  // Optional: estimate fuel consumption with AI once make/model are known.
  async function enrichWithAI() {
    setEnrichBusy(true);
    setVinStatus('Estimating fuel consumption…');
    try {
      const { data } = await aiApi.enrichSpecs({
        make: form.make,
        model: form.model,
        year: form.year,
      });
      if (data.l_per_100km != null) {
        setField('manufacturer_l_per_100km', data.l_per_100km);
        setVinStatus(
          `Estimated ${data.l_per_100km} L/100km${data.note ? ` (${data.note})` : ''} — please confirm.`
        );
      } else {
        setVinStatus("AI couldn't find a fuel-consumption figure for this vehicle.");
      }
    } catch (e) {
      setVinStatus(e.message || 'AI lookup failed.');
    } finally {
      setEnrichBusy(false);
    }
  }

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
        {/* VIN-first: the fastest way to add a vehicle. Photograph the VIN
            plate (or type the VIN) and we look up the rest automatically. */}
        {!isEdit && (
          <div className="space-y-3 rounded-2xl border border-brand-100 bg-brand-50 p-4">
            <div>
              <h2 className="font-semibold text-brand-700">
                Start with the VIN{' '}
                <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs text-white">
                  fastest
                </span>
              </h2>
              <p className="text-sm text-slate-600">
                Photograph the VIN plate — the app reads it and fills in the
                make, model, year, engine and fuel for you. Then just review and
                save.
              </p>
            </div>

            <PhotoField
              label="VIN plate photo"
              onFile={(f) => setFiles((p) => ({ ...p, vin_plate: f || undefined }))}
              scan={{ ocr: 'vin', ai: 'vin', aiEnabled, onValues: onVinScanned }}
            />

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="label" htmlFor="vin-input">
                  …or type the VIN
                </label>
                <input
                  id="vin-input"
                  className="input"
                  value={form.vin ?? ''}
                  onChange={(e) => setField('vin', e.target.value)}
                  placeholder="17-character VIN"
                />
              </div>
              <button
                type="button"
                className="btn-primary"
                disabled={vinBusy}
                onClick={() => decodeAndFill(form.vin)}
              >
                {vinBusy ? '…' : 'Decode'}
              </button>
            </div>

            {aiEnabled && (form.make || form.model) && (
              <button
                type="button"
                className="btn-ghost text-sm"
                disabled={enrichBusy}
                onClick={enrichWithAI}
              >
                {enrichBusy ? 'Estimating…' : '✨ Fill fuel consumption with AI'}
              </button>
            )}

            {vinStatus && (
              <p className="rounded-lg bg-white/70 px-3 py-2 text-sm text-slate-700">
                {vinStatus}
              </p>
            )}
          </div>
        )}

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
        <div className="space-y-4 border-t border-slate-100 pt-4">
          <div>
            <h2 className="font-semibold">Photos &amp; documents</h2>
            <p className="text-sm text-slate-500">
              Optional. Take a photo or choose a file (images or PDFs, up to
              10&nbsp;MB). Where you see scan buttons, the app can read the
              number off the photo and fill the field for you.
              {!aiEnabled && (
                <span> (AI scanning is off — the free on-device scan still works.)</span>
              )}
            </p>
          </div>

          {/* Rego photo — fills the Registration number field */}
          <PhotoField
            label="Rego photo"
            onFile={(f) => setFiles((p) => ({ ...p, rego: f || undefined }))}
            scan={{
              ocr: 'rego',
              ai: 'rego',
              aiEnabled,
              onValues: (v) => v.rego && setField('rego_number', v.rego),
            }}
          />

          {/* Compliance document — stored only, no scan */}
          <PhotoField
            label="Insurance / Roadworthy / Test report"
            onFile={(f) => setFiles((p) => ({ ...p, compliance: f || undefined }))}
          />

          {/* Spec-sheet AI scan — fills manufacturer fuel consumption. Photo is
              used only to read the numbers; it isn't stored. AI only. */}
          {aiEnabled && (
            <PhotoField
              label="Spec sheet (AI scan — fills fuel consumption, not stored)"
              onFile={() => {}}
              scan={{
                ai: 'spec',
                aiEnabled,
                onValues: (v) => {
                  if (v.l_per_100km != null)
                    setField('manufacturer_l_per_100km', v.l_per_100km);
                  if (v.engine_size) setField('engine_size', v.engine_size);
                },
              }}
            />
          )}

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
