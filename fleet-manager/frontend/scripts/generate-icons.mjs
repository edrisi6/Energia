// ─────────────────────────────────────────────────────────────
// Generates the PWA app icons (no image libraries needed).
// Draws a simple white car on the brand-blue background into a raw pixel
// buffer and encodes it as a PNG. Run with: node scripts/generate-icons.mjs
// Outputs into ../public.
// ─────────────────────────────────────────────────────────────
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../public');
mkdirSync(OUT, { recursive: true });

// ── tiny RGBA canvas ─────────────────────────────────────────
function createCanvas(size) {
  const buf = new Uint8Array(size * size * 4);
  // All pixel writes are floored to integer coordinates.
  const set = (x, y, [r, g, b, a = 255]) => {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
  };
  const fillRect = (x0, y0, w, h, color) => {
    x0 = Math.round(x0); y0 = Math.round(y0); w = Math.round(w); h = Math.round(h);
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) set(x, y, color);
  };
  const fillRoundRect = (x0, y0, w, h, rad, color) => {
    x0 = Math.round(x0); y0 = Math.round(y0); w = Math.round(w); h = Math.round(h);
    rad = Math.round(rad);
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        const dx = Math.min(x - x0, x0 + w - 1 - x);
        const dy = Math.min(y - y0, y0 + h - 1 - y);
        if (dx < rad && dy < rad) {
          const cx = x < x0 + rad ? x0 + rad : x0 + w - 1 - rad;
          const cy = y < y0 + rad ? y0 + rad : y0 + h - 1 - rad;
          if ((x - cx) ** 2 + (y - cy) ** 2 > rad * rad) continue;
        }
        set(x, y, color);
      }
    }
  };
  const fillCircle = (cx, cy, r, color) => {
    cx = Math.round(cx); cy = Math.round(cy); r = Math.round(r);
    for (let y = cy - r; y <= cy + r; y++)
      for (let x = cx - r; x <= cx + r; x++)
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) set(x, y, color);
  };
  return { buf, size, set, fillRect, fillRoundRect, fillCircle };
}

// ── PNG encoder ──────────────────────────────────────────────
function crc32(bytes) {
  let crc = ~0;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}
function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([len, typeBytes, data, crc]);
}
function encodePng(canvas) {
  const { buf, size } = canvas;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit, RGBA
  // raw scanlines, each prefixed with filter byte 0
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    buf.subarray(y * size * 4, (y + 1) * size * 4).forEach((v, i) => {
      raw[y * (size * 4 + 1) + 1 + i] = v;
    });
  }
  const idat = deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── draw the car icon ────────────────────────────────────────
const BRAND = [37, 99, 235, 255];     // brand blue
const WHITE = [255, 255, 255, 255];
const TIRE = [30, 41, 59, 255];       // dark slate
const GLASS = [37, 99, 235, 255];

function drawIcon(size, { maskable = false } = {}) {
  const c = createCanvas(size);
  const S = size;
  // background (maskable gets a full-bleed safe background)
  c.fillRect(0, 0, S, S, BRAND);

  // car body
  c.fillRoundRect(S * 0.16, S * 0.46, S * 0.68, S * 0.20, S * 0.06, WHITE);
  // cabin / roof
  c.fillRoundRect(S * 0.34, S * 0.34, S * 0.30, S * 0.16, S * 0.05, WHITE);
  // windows
  c.fillRoundRect(S * 0.37, S * 0.37, S * 0.11, S * 0.10, S * 0.02, GLASS);
  c.fillRoundRect(S * 0.50, S * 0.37, S * 0.11, S * 0.10, S * 0.02, GLASS);
  // wheels
  c.fillCircle(S * 0.34, S * 0.66, S * 0.075, TIRE);
  c.fillCircle(S * 0.66, S * 0.66, S * 0.075, TIRE);
  c.fillCircle(S * 0.34, S * 0.66, S * 0.032, WHITE);
  c.fillCircle(S * 0.66, S * 0.66, S * 0.032, WHITE);

  return encodePng(c);
}

writeFileSync(resolve(OUT, 'icon-192.png'), drawIcon(192));
writeFileSync(resolve(OUT, 'icon-512.png'), drawIcon(512));
writeFileSync(resolve(OUT, 'icon-maskable-512.png'), drawIcon(512, { maskable: true }));
writeFileSync(resolve(OUT, 'apple-touch-icon.png'), drawIcon(180));
console.log('Generated PWA icons in', OUT);
