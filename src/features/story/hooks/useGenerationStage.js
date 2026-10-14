import { useEffect, useState } from 'react';

// 이야기 짜기(0) → 글 쓰기(1) → 그림 그리기(2) 중 지금 어느 단계인지 알려줘요.
//
// 지금은 동화 생성 API가 없어서 일정 시간마다 다음 단계로 넘기는 임시 구현이에요.
// 실제 생성이 연결되면 이 훅만 서버가 알려주는 진행 상태를 따르도록 바꾸면 되고,
// GeneratingStep은 stage 값만 받으므로 화면 코드는 그대로 둘 수 있어요.
export const GENERATION_STAGE_DELAYS = [4000, 5000];

export function useGenerationStage(delays = GENERATION_STAGE_DELAYS) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    let elapsed = 0;
    const timers = delays.map((delay, index) => {
      elapsed += delay;
      return setTimeout(() => setStage(index + 1), elapsed);
    });

    return () => timers.forEach(clearTimeout);
  }, [delays]);

  return stage;
}
