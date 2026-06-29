// ─────────────────────────────────────────────────────────────
// API calls for the optional cloud AI scanning feature. Images are downscaled
// before upload to keep the scan fast and cheap.
// ─────────────────────────────────────────────────────────────
import { api, getToken } from './client';
import { resizeImage } from '../utils/imageResize';

export const aiApi = {
  status: () => api.get('/ai/status'),

  // Estimate fuel consumption for a known make/model/year.
  enrichSpecs: ({ make, model, year }) =>
    api.post('/ai/enrich-specs', { make, model, year }),

  async extract(file, target) {
    const small = await resizeImage(file, 1500, 0.8);
    const form = new FormData();
    form.append('target', target);
    form.append('image', small);

    const res = await fetch('/api/ai/extract', {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: form,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && data.error) || 'AI scan failed.');
    return data; // { target, data, model }
  },
};
