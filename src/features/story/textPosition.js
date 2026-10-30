// 그림 위에 글을 놓을 자리예요. 서버가 쪽마다 textPosition(TOP | BOTTOM)을 주고, 값이 없으면 아래(bottom)예요.
// 그림은 위나 아래 30%를 글 놓을 자리로 비워서 그려져요.
export function textPositionOf(page) {
  return String(page?.textPosition ?? '').toUpperCase() === 'TOP' ? 'top' : 'bottom';
}
