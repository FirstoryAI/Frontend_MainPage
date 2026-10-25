import { apiClient } from './apiClient';

export function getHome() {
  return apiClient.get('/api/home');
}

export function getCurrentMember() {
  return apiClient.get('/api/me');
}
