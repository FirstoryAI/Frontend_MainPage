import { apiClient } from './apiClient';

export const markOnboardingSeen = () => apiClient.post('/api/me/onboarding-seen');
export const setEmailNotify = (agreed) => apiClient.put('/api/me/consents/email-notify', { agreed });
export const changePassword = async ({ currentPassword, newPassword }) => {
  try {
    return await apiClient.post('/api/me/password', { currentPassword, newPassword });
  } catch (error) {
    if (error.code === 'PASSWORD_NOT_SET') error.message = '비밀번호 찾기에서 새 비밀번호를 설정해 주세요.';
    throw error;
  }
};
export const withdraw = (currentPassword, hasPassword = true) =>
  apiClient.post('/api/me/withdraw', hasPassword ? { currentPassword } : {});
