import { apiClient } from './apiClient';

export const getChildren = () => apiClient.get('/api/children');
export const getChildOptions = () => apiClient.get('/api/children/options');
export const createChild = (profile) => apiClient.post('/api/children', profile);
export const updateChild = (id, profile) => apiClient.put(`/api/children/${id}`, profile);
export const deleteChild = (id) => apiClient.delete(`/api/children/${id}`);
export const renameChild = (id, displayName) =>
  apiClient.patch(`/api/children/${id}/display-name`, { displayName });
