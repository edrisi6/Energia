// ─────────────────────────────────────────────────────────────
// On-device OCR using Tesseract.js — free and private (runs in the browser,
// nothing is uploaded). Tesseract is loaded lazily the first time it's used so
// it doesn't bloat the initial app load.
// ─────────────────────────────────────────────────────────────

// Read all text from an image file.
export async function ocrText(file) {
  const Tesseract = (await import('tesseract.js')).default;
  const { data } = await Tesseract.recognize(file, 'eng');
  return data.text || '';
}

// Pull a VIN (17 chars, letters+digits, never I/O/Q) out of OCR text.
export function extractVin(text) {
  const cleaned = (text || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const m = cleaned.match(/[A-HJ-NPR-Z0-9]{17}/);
  return m ? m[0] : null;
}

// Best-guess a registration/plate: the most plausible short alphanumeric token.
export function extractRego(text) {
  const tokens = (text || '')
    .toUpperCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^A-Z0-9-]/g, ''))
    .filter((t) => /^[A-Z0-9-]{4,9}$/.test(t) && /[A-Z]/.test(t) && /[0-9]/.test(t));
  // Prefer the token with both letters and digits and a reasonable length.
  tokens.sort((a, b) => b.length - a.length);
  return tokens[0] || null;
}
