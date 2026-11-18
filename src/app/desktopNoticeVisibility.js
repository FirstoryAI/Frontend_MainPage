const SEEN_KEY = 'firstory.desktopNoticeSeen';

// 마우스로 쓰는 컴퓨터인지예요. (휴대폰·태블릿은 빼요. 키보드를 붙인 아이패드도 태블릿으로 봐요)
function isDesktop() {
  if (typeof window === 'undefined') return false;
  const fineMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return fineMouse && !mobile && !iPadOS;
}

// 데스크톱이고 이번 창에서 아직 안내를 닫지 않았으면 보여줘요. 닫으면 창을 닫기 전까지 다시 뜨지 않아요.
export function shouldShowDesktopNotice() {
  if (!isDesktop()) return false;
  try {
    return window.sessionStorage.getItem(SEEN_KEY) !== '1';
  } catch {
    return true;
  }
}

export function markDesktopNoticeSeen() {
  try {
    window.sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    // 저장소를 못 써도 지금 화면에서는 닫혀요.
  }
}
