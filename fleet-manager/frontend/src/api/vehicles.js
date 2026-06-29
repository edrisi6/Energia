// API calls for vehicles, grouped in one place.
import { api } from './client';

export const vehiclesApi = {
  list: () => api.get('/vehicles').then((r) => r.vehicles),
  get: (id) => api.get(`/vehicles/${id}`).then((r) => r.vehicle),
  create: (data) => api.post('/vehicles', data).then((r) => r.vehicle),
  update: (id, data) => api.put(`/vehicles/${id}`, data).then((r) => r.vehicle),
  remove: (id) => api.del(`/vehicles/${id}`),
};
