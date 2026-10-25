import { apiClient } from './apiClient';

const story = (id) => `/api/stories/${id}`;

// 동화 만들기 (생성 흐름)
export const createStory = () => apiClient.post('/api/stories');
export const saveSituation = (id, body) => apiClient.put(`${story(id)}/situation`, body);
export const saveChild = (id, body) => apiClient.put(`${story(id)}/child`, body);
export const saveMessage = (id, message) => apiClient.put(`${story(id)}/message`, { message });
export const saveTone = (id, tone) => apiClient.put(`${story(id)}/tone`, { tone });
export const startInterview = (id) => apiClient.post(`${story(id)}/interview/start`);
export const answerInterview = (id, answer) =>
  apiClient.post(`${story(id)}/interview/answer`, answer === null ? { skip: true } : { answer });
export const getDraft = (id) => apiClient.get(`${story(id)}/draft`);
export const confirmStory = (id) => apiClient.post(`${story(id)}/confirm`);

// 동화 생성·검토
export const getGeneration = (id) => apiClient.get(`${story(id)}/generation`);
export const retryStory = (id) => apiClient.post(`${story(id)}/retry`);
export const getPreview = (id) => apiClient.get(`${story(id)}/preview`);
export const regenerateStory = (id, body) => apiClient.post(`${story(id)}/regenerate`, body);
export const approveStory = (id) => apiClient.post(`${story(id)}/approve`);
export const getVersions = (id) => apiClient.get(`${story(id)}/versions`);
export const setCurrentVersion = (id, versionId) =>
  apiClient.put(`${story(id)}/current-version`, { versionId });

// 서재·상세·읽기
export const getStoryDetail = (id) => apiClient.get(story(id));
export const deleteStory = (id) => apiClient.delete(story(id));
export const getGuide = (id) => apiClient.get(`${story(id)}/guide`);
export const getBook = (id) => apiClient.get(`${story(id)}/book`);
