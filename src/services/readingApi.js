import { apiClient } from './apiClient';

export const startReading = (storyId) => apiClient.post(`/api/stories/${storyId}/reading-sessions`);

// 끝나지 않은 읽기가 없으면 null(204)이에요.
export const resumeReading = (storyId) => apiClient.get(`/api/stories/${storyId}/reading-sessions/resume`);

export const saveReadingProgress = (sessionId, page) =>
  apiClient.put(`/api/reading-sessions/${sessionId}/progress`, { page });

export const completeReading = (sessionId) => apiClient.post(`/api/reading-sessions/${sessionId}/complete`);
