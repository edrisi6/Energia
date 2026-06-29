// API call for decoding a VIN into vehicle details (free, public database).
import { api } from './client';

export const vinApi = {
  decode: (vin) => api.get(`/vin/decode?vin=${encodeURIComponent(vin)}`),
};
