import { apiClient, initializeCsrf } from './apiClient';

export function sendEmailVerificationCode(email, purpose = 'SIGNUP') {
  return apiClient.post('/api/auth/email/send-code', { email, purpose });
}

export function verifyEmailCode(email, code) {
  return apiClient.post('/api/auth/email/verify', { email, code });
}

export const kakaoLogin = (code, redirectUri) =>
  apiClient.post('/api/auth/kakao/login', { code, redirectUri, rememberMe: false });

export const kakaoSignup = (payload) => apiClient.post('/api/auth/kakao/signup', payload);

export const resetPassword = (email, newPassword) =>
  apiClient.post('/api/auth/password/reset', { email, newPassword });

// 가입된 이메일인지 미리 봐요. { available: true }면 쓸 수 있어요. IP마다 1분에 10번까지라 입력할 때마다 부르지 않아요.
export function checkEmail(email) {
  return apiClient.post('/api/auth/email/check', { email });
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
