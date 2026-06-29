// ─────────────────────────────────────────────────────────────
// Documents/photos for a vehicle, grouped into three slots:
//   Rego · VIN plate · Compliance (insurance / roadworthy / test report).
// Images show as thumbnails; PDFs show a "View" link. Owners/managers can
// upload and delete.
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { documentsApi } from '../api/documents';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

const SLOTS = [
  { type: 'rego', label: 'Registration (Rego)' },
  { type: 'vin_plate', label: 'VIN plate' },
  { type: 'compliance', label: 'Insurance / Roadworthy / Test report' },
];

// Shows one document: thumbnail for images, a link for PDFs, with delete.
function DocThumb({ vehicleId, doc, canManage, onDeleted }) {
  const [url, setUrl] = useState(null);
  const isImage = (doc.mime_type || '').startsWith('image/');

  useEffect(() => {
    let revoke;
    documentsApi
      .fileUrl(vehicleId, doc.id)
      .then((u) => {
        revoke = u;
        setUrl(u);
      })
      .catch(() => {});
    return () => revoke && URL.revokeObjectURL(revoke);
  }, [vehicleId, doc.id]);

  async function del() {
    if (!window.confirm('Delete this file?')) return;
    await documentsApi.remove(vehicleId, doc.id);
    onDeleted();
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200">
      <a href={url || undefined} target="_blank" rel="noreferrer" className="block">
        {isImage && url ? (
          <img src={url} alt={doc.original_filename} className="h-28 w-full object-cover" />
        ) : (
          <div className="flex h-28 w-full flex-col items-center justify-center bg-slate-50 text-slate-500">
            <span className="text-2xl">📄</span>
            <span className="mt-1 text-xs">View file</span>
          </div>
        )}
      </a>
      <div className="flex items-center justify-between gap-1 px-2 py-1">
        <span className="truncate text-xs text-slate-500">{doc.original_filename}</span>
        {canManage && (
          <button onClick={del} className="text-xs text-red-600 hover:underline">
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

export default function VehicleDocuments({ vehicleId }) {
  const { canManage } = useAuth();
  const [docs, setDocs] = useState(null);
  const [error, setError] = useState('');
  const [busySlot, setBusySlot] = useState(null);

  async function refresh() {
    try {
      setDocs(await documentsApi.list(vehicleId));
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    setDocs(null);
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId]);

  async function onPick(slotType, e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    setBusySlot(slotType);
    setError('');
    try {
      await documentsApi.upload(vehicleId, slotType, file);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusySlot(null);
    }
  }

  if (docs === null) return <Spinner />;

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {SLOTS.map((slot) => {
        const slotDocs = docs.filter((d) => d.doc_type === slot.type);
        return (
          <div key={slot.type} className="card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-medium">{slot.label}</h3>
              {canManage && (
                <label className="cursor-pointer text-sm text-brand-600 hover:underline">
                  {busySlot === slot.type ? 'Uploading…' : '+ Upload'}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    disabled={busySlot === slot.type}
                    onChange={(e) => onPick(slot.type, e)}
                  />
                </label>
              )}
            </div>
            {slotDocs.length === 0 ? (
              <p className="text-sm text-slate-400">No file uploaded.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {slotDocs.map((doc) => (
                  <DocThumb
                    key={doc.id}
                    vehicleId={vehicleId}
                    doc={doc}
                    canManage={canManage}
                    onDeleted={refresh}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
