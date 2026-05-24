import api from '@/lib/api';

export const feedbackApi = {
  create: (data: { type: string; title: string; description?: string; contact?: string }) =>
    api.post('/feedback', data),
  getMyList: () =>
    api.get('/feedback/my'),
};
