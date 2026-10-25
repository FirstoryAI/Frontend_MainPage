import { useLayoutEffect, useState } from 'react';

// 1440×960 화면 전체를 창 크기에 맞춰 줄이는 배율이에요. (미리보기·대화 가이드처럼 고정 캔버스 화면용)
function getSceneScale() {
  if (window.innerWidth <= 760) return 1;
  return Math.min(1, window.innerWidth / 1440, window.innerHeight / 960);
}

export function useSceneScale() {
  const [scale, setScale] = useState(getSceneScale);

  useLayoutEffect(() => {
    const updateScale = () => setScale(getSceneScale());
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  return scale;
}
