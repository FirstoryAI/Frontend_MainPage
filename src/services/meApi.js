import { apiClient } from './apiClient';

export const markOnboardingSeen = () => apiClient.post('/api/me/onboarding-seen');
export const setSmsNotify = (agreed) => apiClient.put('/api/me/consents/sms-notify', { agreed });
export const changePassword = ({ currentPassword, newPassword }) =>
  apiClient.post('/api/me/password', { currentPassword, newPassword });
export const changePhone = ({ currentPassword, phone }) =>
  apiClient.post('/api/me/phone', { currentPassword, phone });
export const withdraw = (currentPassword) => apiClient.post('/api/me/withdraw', { currentPassword });
