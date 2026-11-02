// 새 표지는 정사각형으로, 예전 16:9 캐릭터 시트는 원래 비율로 보여줌
export function setCoverFrameRatio(event) {
  const image = event.currentTarget;
  const frame = image.closest('[data-cover-frame]');
  if (!frame || !image.naturalWidth || !image.naturalHeight) return;

  frame.dataset.coverRatio = image.naturalWidth / image.naturalHeight > 1.5 ? 'wide' : 'square';
}
