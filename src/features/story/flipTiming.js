// 책장 한 장이 넘어가는 시간(ms)이에요. 어느 화면, 어떤 크기의 책이든, 버튼으로 넘기든 끌어서 넘기든 같은 속도예요.
export const FLIP_MS = 500;

// 책장이 한 번에 넘어가는 거리(px)예요. 라이브러리(page-flip) 계산과 같아요: 책장 폭 × 2 − 책 높이 / 10
export const flipDistance = (pageWidth, height) => pageWidth * 2 - height / 10;

// 책장이 1px 움직이는 데 걸리는 시간(ms)이에요. 한 장 전체(버튼)가 FLIP_MS인 속도로, 끌었다 놓은 뒤 남은 거리를 이 속도로 마저 넘겨요.
export const flipMsPerPx = (pageWidth, height) => {
  const distance = flipDistance(pageWidth, height);
  return distance > 0 ? FLIP_MS / distance : 0;
};
