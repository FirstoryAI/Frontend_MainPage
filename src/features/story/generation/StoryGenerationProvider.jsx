import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNotifications } from '../../notifications/useNotifications';
import { StoryGenerationContext } from './storyGenerationContext';

// 이야기 짜기(0) → 글 쓰기(1) → 그림 그리기(2) 중 지금 어느 단계인지 알려줘요.
//
// 지금은 동화 생성 API가 없어서 일정 시간마다 다음 단계로 넘기는 임시 구현이에요.
// 실제 생성이 연결되면 이 파일만 서버가 알려주는 진행·완료 상태를 따르도록 바꾸면 되고,
// 화면은 job의 stage·status만 보므로 그대로 둘 수 있어요.
// 동화 만드는 화면을 나가도 생성이 이어지도록 화면이 아니라 앱 전체에서 한 번만 돌려요.
const GENERATION_STAGE_DELAYS = [4000, 5000];
// 마지막 단계(그림 그리기)를 이만큼(ms) 보여준 뒤 완료로 넘겨요.
const LAST_STAGE_HOLD = 4000;

// 진행 중인 동화는 하나만 둬요. 새로 시작하면 이전 진행은 멈추고 처음부터 다시 해요.
export function StoryGenerationProvider({ children }) {
  const { addNotification } = useNotifications();
  const [job, setJob] = useState(null);
  const timers = useRef([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const startGeneration = useCallback(
    ({ title }) => {
      clearTimers();

      const id = `story-${Date.now()}`;
      setJob({ id, title, stage: 0, status: 'running', startedAt: Date.now() });

      let elapsed = 0;
      GENERATION_STAGE_DELAYS.forEach((delay, index) => {
        elapsed += delay;
        timers.current.push(
          setTimeout(() => {
            setJob((current) => (current?.id === id ? { ...current, stage: index + 1 } : current));
          }, elapsed),
        );
      });

      timers.current.push(
        setTimeout(() => {
          setJob((current) => (current?.id === id ? { ...current, status: 'done' } : current));
          addNotification({
            id,
            title: '동화 제작이 완료되었어요',
            message: `‘${title}’ 동화가 완성되었어요. 서재에서 확인해 보세요.`,
            href: '/library',
          });
        }, elapsed + LAST_STAGE_HOLD),
      );
    },
    [addNotification, clearTimers],
  );

  const value = useMemo(() => ({ job, startGeneration }), [job, startGeneration]);

  return <StoryGenerationContext.Provider value={value}>{children}</StoryGenerationContext.Provider>;
}
