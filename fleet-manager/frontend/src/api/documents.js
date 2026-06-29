// ─────────────────────────────────────────────────────────────
// API calls for vehicle documents/photos. Uploads use multipart/form-data,
// and viewing a file fetches it with the auth token and returns a temporary
// object URL the browser can show.
// ─────────────────────────────────────────────────────────────
import { api, getToken } from './client';

export const documentsApi = {
  list: (vehicleId) =>
    api.get(`/vehicles/${vehicleId}/documents`).then((r) => r.documents),

  remove: (vehicleId, docId) =>
    api.del(`/vehicles/${vehicleId}/documents/${docId}`),

  // Upload a single file under a slot (rego / vin_plate / compliance).
  async upload(vehicleId, docType, file) {
    const form = new FormData();
    form.append('doc_type', docType);
    form.append('file', file);

    const res = await fetch(`/api/vehicles/${vehicleId}/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` }, // no Content-Type: the browser sets the multipart boundary
      body: form,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && data.error) || 'Upload failed.');
    return data.document;
  },

  // Fetch a document's file (with auth) as a temporary object URL for display.
  async fileUrl(vehicleId, docId) {
    const res = await fetch(
      `/api/vehicles/${vehicleId}/documents/${docId}/file`,
      { headers: { Authorization: `Bearer ${getToken()}` } }
    );
    if (!res.ok) throw new Error('Could not load the file.');
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },
};
