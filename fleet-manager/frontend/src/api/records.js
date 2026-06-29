// API calls for vehicle records and the history timeline.
import { api } from './client';

export const recordsApi = {
  list: (vehicleId, type) =>
    api.get(`/vehicles/${vehicleId}/records/${type}`).then((r) => r.records),
  create: (vehicleId, type, data) =>
    api
      .post(`/vehicles/${vehicleId}/records/${type}`, data)
      .then((r) => r.record),
  update: (vehicleId, type, id, data) =>
    api
      .put(`/vehicles/${vehicleId}/records/${type}/${id}`, data)
      .then((r) => r.record),
  remove: (vehicleId, type, id) =>
    api.del(`/vehicles/${vehicleId}/records/${type}/${id}`),
  history: (vehicleId) =>
    api.get(`/vehicles/${vehicleId}/history`).then((r) => r.items),
};
