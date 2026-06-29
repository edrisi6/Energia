// ─────────────────────────────────────────────────────────────
// Generic record section used by every vehicle tab (Registration, Insurance,
// Roadworthy, Maintenance, Repairs, Fuel). Driven by the config in
// config/recordTypes.js, it shows the list and an add/edit form, and handles
// create/update/delete. Whether write controls appear depends on the user's
// role (the backend enforces the same rules regardless).
// ─────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from 'react';
import { recordsApi } from '../api/records';
import { usersApi } from '../api/users';
import { RECORD_TYPES } from '../config/recordTypes';
import { useAuth } from '../context/AuthContext';
import { downloadIcs } from '../utils/calendar';
import Spinner from './Spinner';

// A single input row in the add/edit form.
function Field({ field, value, onChange, users }) {
  const common = { id: field.name, className: 'input' };

  if (field.type === 'textarea') {
    return (
      <textarea
        {...common}
        rows={2}
        value={value ?? ''}
        onChange={(e) => onChange(field.name, e.target.value)}
      />
    );
  }
  if (field.type === 'checkbox') {
    return (
      <input
        id={field.name}
        type="checkbox"
        className="h-5 w-5 rounded border-slate-300"
        checked={Boolean(value)}
        onChange={(e) => onChange(field.name, e.target.checked)}
      />
    );
  }
  if (field.type === 'driver') {
    return (
      <select
        {...common}
        value={value ?? ''}
        onChange={(e) => onChange(field.name, e.target.value)}
      >
        <option value="">Unassigned</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      {...common}
      type={field.type}
      step={field.type === 'number' ? 'any' : undefined}
      value={value ?? ''}
      onChange={(e) => onChange(field.name, e.target.value)}
    />
  );
}

export default function RecordSection({ vehicleId, type, vehicleLabel = 'Vehicle' }) {
  const cfg = RECORD_TYPES[type];
  const { user } = useAuth();
  const canWrite = cfg.writeRoles.includes(user?.role);

  // Build + download an .ics for a record, when its type supports it.
  async function addToCalendar(record) {
    const event = cfg.calendar?.(record, vehicleLabel);
    if (!event || !event.date) return;
    try {
      await downloadIcs({
        ...event,
        filename: `${vehicleLabel}-${type}.ics`,
      });
    } catch (e) {
      alert(e.message);
    }
  }

  const [records, setRecords] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  // Form state: null = closed, {} = adding, {id,...} = editing.
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);

  const usersById = useMemo(() => {
    const map = {};
    for (const u of users) map[u.id] = u;
    return map;
  }, [users]);

  // Does this type use a driver dropdown? If so we need the users list.
  const needsUsers = cfg.fields.some((f) => f.type === 'driver');

  async function refresh() {
    try {
      const list = await recordsApi.list(vehicleId, type);
      setRecords(list);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    setRecords(null);
    setDraft(null);
    setError('');
    refresh();
    if (needsUsers) usersApi.list().then(setUsers).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId, type]);

  function setField(name, value) {
    setDraft((d) => ({ ...d, [name]: value }));
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (draft.id) {
        await recordsApi.update(vehicleId, type, draft.id, draft);
      } else {
        await recordsApi.create(vehicleId, type, draft);
      }
      setDraft(null);
      await refresh();
    } catch (err) {
      setError(err.message || 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  async function del(id) {
    if (!window.confirm('Delete this record?')) return;
    try {
      await recordsApi.remove(vehicleId, type, id);
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  if (records === null) return <Spinner />;

  return (
    <div className="space-y-3">
      {/* Add button / form */}
      {canWrite && !draft && (
        <button onClick={() => setDraft({})} className="btn-primary w-full">
          + Add {cfg.label.toLowerCase()}
        </button>
      )}

      {draft && (
        <form onSubmit={save} className="card space-y-3 p-4">
          <h3 className="font-semibold">
            {draft.id ? 'Edit' : 'New'} {cfg.label.toLowerCase()}
          </h3>
          {cfg.fields.map((f) => (
            <div
              key={f.name}
              className={
                f.type === 'checkbox' ? 'flex items-center gap-2' : undefined
              }
            >
              <label className={f.type === 'checkbox' ? '' : 'label'} htmlFor={f.name}>
                {f.label}
              </label>
              <Field
                field={f}
                value={draft[f.name]}
                onChange={setField}
                users={users}
              />
            </div>
          ))}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setDraft(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && !draft && <p className="text-sm text-red-600">{error}</p>}

      {/* List */}
      {records.length === 0 ? (
        <div className="card px-3 py-8 text-center text-sm text-slate-500">
          No {cfg.label.toLowerCase()} records yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {records.map((r) => {
            const s = cfg.summary(r, { usersById });
            return (
              <li key={r.id} className="card flex items-center justify-between p-3">
                <div className="min-w-0">
                  <div className="font-medium">{s.title}</div>
                  <div className="truncate text-sm text-slate-500">
                    {s.subtitle}
                  </div>
                </div>
                <div className="flex items-center gap-3 pl-2">
                  {s.right && <span className="font-semibold">{s.right}</span>}
                  {/* Add-to-calendar, when this record type + record has a date */}
                  {cfg.calendar && cfg.calendar(r, vehicleLabel)?.date && (
                    <button
                      onClick={() => addToCalendar(r)}
                      title="Add to calendar"
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-brand-600 hover:bg-slate-50"
                    >
                      📅
                    </button>
                  )}
                  {canWrite && (
                    <div className="flex gap-1">
                      <button
                        onClick={() =>
                          setDraft({
                            // copy values, turning nulls into '' for inputs
                            ...Object.fromEntries(
                              Object.entries(r).map(([k, v]) => [
                                k,
                                v === null ? '' : v,
                              ])
                            ),
                          })
                        }
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => del(r.id)}
                        className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
