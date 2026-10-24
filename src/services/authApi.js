import { apiClient, initializeCsrf } from './apiClient';

export function sendPhoneVerificationCode(phone, purpose = 'SIGNUP') {
  return apiClient.post('/api/auth/phone/send-code', { phone, purpose });
}

export function verifyPhoneCode(phone, code) {
  return apiClient.post('/api/auth/phone/verify', { phone, code });
}

export function signup(payload) {
  return apiClient.post('/api/auth/signup', payload);
}

export function login(payload) {
  return apiClient.post('/api/auth/login', payload);
}

export async function logout() {
  await apiClient.post('/api/auth/logout');

  try {
    await initializeCsrf();
  } catch {
    // A later state-changing request will retry CSRF initialization.
  }
}
