const STORAGE_KEY = 'firstory.notifications';

// 알림은 서버 API가 생기기 전까지 이 브라우저에만 저장해요.
export function readNotifications() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export function writeNotifications(notifications) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch {
    // 저장 공간을 쓸 수 없어도 현재 화면의 알림은 그대로 보여줘요.
  }
}
