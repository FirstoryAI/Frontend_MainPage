import { apiClient } from './apiClient';
import { MOCK_LIBRARY_ENABLED, getMockStories } from './mockLibrary';

export function getStories({ filter = 'ALL', page = 0, size = 20 } = {}) {
  if (MOCK_LIBRARY_ENABLED) return Promise.resolve(getMockStories({ filter, page, size }));

  const params = new URLSearchParams({ filter, page: String(page), size: String(size) });
  return apiClient.get(`/api/stories?${params.toString()}`);
}
