// API calls for reminders.
import { api } from './client';

export const remindersApi = {
  list: (attentionOnly = false) =>
    api
      .get(`/reminders${attentionOnly ? '?attention=1' : ''}`)
      .then((r) => r.reminders),
  recompute: () => api.post('/reminders/recompute'),
};
