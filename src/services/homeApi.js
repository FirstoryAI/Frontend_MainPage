import { apiClient } from './apiClient';
import { MOCK_LIBRARY_ENABLED, getMockHome } from './mockLibrary';

export function getHome() {
  if (MOCK_LIBRARY_ENABLED) return Promise.resolve(getMockHome());

  return apiClient.get('/api/home');
}


export function getCurrentMember() {
  return apiClient.get('/api/me');
}
