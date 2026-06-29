// ─────────────────────────────────────────────────────────────
// A photo/document field with:
//   • 📷 Take photo  — opens the camera directly on phones (capture attribute)
//   • 📁 Choose file — pick an existing image or PDF
//   • a preview + remove
//   • optional scan buttons:
//       🔎 Scan (free)   — on-device OCR (private, runs in the browser)
//       ✨ Scan with AI  — cloud AI (only shown when configured on the server)
//
// Scans call `scan.onValues(fields)` with normalised fields so the parent form
// can drop them into the right inputs.
// ─────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react';
import { ocrText, extractVin, extractRego } from '../utils/ocr';
import { aiApi } from '../api/ai';

export default function PhotoField({ label, onFile, scan = null }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const cameraRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pick(f) {
    setMessage('');
    setFile(f || null);
    onFile(f || null);
  }

  // On-device OCR (free).
  async function scanOnDevice() {
    if (!file) return;
    setBusy('ocr');
    setMessage('Reading the photo…');
    try {
      const text = await ocrText(file);
      const value = scan.ocr === 'vin' ? extractVin(text) : extractRego(text);
      if (value) {
        scan.onValues(scan.ocr === 'vin' ? { vin: value } : { rego: value });
        setMessage(`Read: ${value} — check it's correct.`);
      } else {
        setMessage("Couldn't read it clearly. Try a sharper photo or type it in.");
      }
    } catch {
      setMessage('Scan failed. You can type the value in instead.');
    } finally {
      setBusy('');
    }
  }

  // Cloud AI scan (opt-in, costs a little).
  async function scanWithAI() {
    if (!file) return;
    setBusy('ai');
    setMessage('Scanning with AI…');
    try {
      const { data } = await aiApi.extract(file, scan.ai);
      scan.onValues(data);
      const got = Object.values(data).filter((v) => v !== null && v !== '');
      setMessage(got.length ? 'Filled in from the photo — please check.' : "AI couldn't read it.");
    } catch (e) {
      setMessage(e.message || 'AI scan failed.');
    } finally {
      setBusy('');
    }
  }

  return (
    <div>
      <label className="label">{label}</label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="btn-ghost text-sm"
        >
          📷 Take photo
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="btn-ghost text-sm"
        >
          📁 Choose file
        </button>
        {file && (
          <button
            type="button"
            onClick={() => pick(null)}
            className="text-sm text-red-600 hover:underline"
          >
            Remove
          </button>
        )}
      </div>

      {/* Hidden inputs: one opens the camera directly, one is a normal picker. */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />

      {/* Preview */}
      {file && (
        <div className="mt-2 flex items-center gap-3">
          {previewUrl ? (
            <img src={previewUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
          ) : (
            <span className="text-2xl">📄</span>
          )}
          <span className="truncate text-sm text-slate-500">{file.name}</span>
        </div>
      )}

      {/* Scan buttons */}
      {scan && file && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {scan.ocr && (
            <button
              type="button"
              onClick={scanOnDevice}
              disabled={busy !== ''}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {busy === 'ocr' ? 'Scanning…' : '🔎 Scan (free)'}
            </button>
          )}
          {scan.ai && scan.aiEnabled && (
            <button
              type="button"
              onClick={scanWithAI}
              disabled={busy !== ''}
              className="rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs text-brand-700 hover:bg-brand-100 disabled:opacity-50"
            >
              {busy === 'ai' ? 'Scanning…' : '✨ Scan with AI'}
            </button>
          )}
        </div>
      )}

      {message && <p className="mt-1 text-xs text-slate-500">{message}</p>}
    </div>
  );
}
