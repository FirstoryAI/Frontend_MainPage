import { apiClient } from './apiClient';

export function getStories({ filter = 'ALL', page = 0, size = 20 } = {}) {
  const params = new URLSearchParams({ filter, page: String(page), size: String(size) });
  return apiClient.get(`/api/stories?${params.toString()}`);
}
