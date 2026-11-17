const KEY = 'firstory.pendingReadingFeedback';

export function getPendingReadingFeedback() {
  try {
    const value = JSON.parse(window.localStorage.getItem(KEY) || 'null');
    return value?.memberId != null && value?.sessionId != null ? value : null;
  } catch {
    return null;
  }
}

export function savePendingReadingFeedback(memberId, sessionId) {
  if (memberId == null || sessionId == null) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ memberId, sessionId }));
  } catch {
    // 저장소를 사용할 수 없어도 현재 읽기 흐름은 계속 진행해요.
  }
}

export function clearPendingReadingFeedback(sessionId) {
  if (getPendingReadingFeedback()?.sessionId !== sessionId) return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // 다음 접속 때 서버의 제출 상태를 다시 확인해요.
  }
}
