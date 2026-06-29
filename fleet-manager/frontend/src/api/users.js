// API calls for users (read-only list used for driver dropdowns).
import { api } from './client';

export const usersApi = {
  list: () => api.get('/users').then((r) => r.users),
};
