import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNotifications } from '../../notifications/useNotifications';
import { getGeneration, getStoryDetail } from '../../../services/storiesApi';
import { getHome } from '../../../services/homeApi';
import { GENERATING_STATUSES, toLoadingStage } from '../storyMappers';
import { StoryGenerationContext } from './storyGenerationContext';

// 서버가 뒤에서 동화를 만드는 동안 진행 상태를 읽어 와요. (GET /api/stories/{id}/generation)
// 동화 만드는 화면을 나가도 이어지도록 화면이 아니라 앱 전체에서 한 번만 돌려요.
// 서버는 저장된 진행만 읽어서 3초마다 불러도 돼요.
const POLL_INTERVAL = 3000;

// 진행 중인 동화는 하나만 따라가요. 새로 시작하면 이전 것은 더 이상 따라가지 않아요.
// job: { storyId, stage(0~2), status: 'running' | 'done' | 'failed', title, error, notificationId }
export function StoryGenerationProvider({ children }) {
  const { addNotification } = useNotifications();
  const [job, setJob] = useState(null);
  const timer = useRef(null);
  const activeStory = useRef(null);
  // poll이 자기 자신을 다시 예약할 수 있게 최신 poll을 ref에 담아 둬요.
  const pollRef = useRef(null);

  const stopPolling = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = null;
    activeStory.current = null;
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const poll = useCallback(
    async (storyId) => {
      if (activeStory.current !== storyId) return;

      try {
        const generation = await getGeneration(storyId);
        if (activeStory.current !== storyId) return;

        if (GENERATING_STATUSES.includes(generation.status)) {
          setJob((current) =>
            current?.storyId === storyId ? { ...current, stage: toLoadingStage(generation.stage) } : current,
          );
          timer.current = setTimeout(() => pollRef.current(storyId), POLL_INTERVAL);
          return;
        }

        stopPolling();

        if (generation.status === 'FAILED') {
          const notificationId = `story-${storyId}-${generation.runNo}-failed`;
          setJob({ storyId, stage: 2, status: 'failed', error: generation.error, notificationId });
          addNotification({
            id: notificationId,
            title: '동화를 만들지 못했어요',
            message: '서재에서 다시 만들어 볼 수 있어요.',
            href: '/library',
          });
          return;
        }

        // REVIEWING(확인을 기다려요)이 되면 다 만들어진 거예요.
        const detail = await getStoryDetail(storyId).catch(() => null);
        const title = detail?.title ?? '새 동화';
        const notificationId = `story-${storyId}-${generation.runNo}-done`;
        setJob({ storyId, stage: 2, status: 'done', title, notificationId });
        addNotification({
          id: notificationId,
          title: '동화 제작이 완료되었어요',
          message: `‘${title}’ 동화가 완성되었어요. 서재에서 확인해 보세요.`,
          href: '/library',
        });
      } catch (error) {
        if (activeStory.current !== storyId) return;
        // 로그아웃됐거나 지워진 동화면 더 따라가지 않아요. 네트워크 문제는 잠시 뒤 다시 시도해요.
        if (error.status === 401 || error.status === 403 || error.status === 404) {
          stopPolling();
          setJob(null);
          return;
        }
        timer.current = setTimeout(() => pollRef.current(storyId), POLL_INTERVAL);
      }
    },
    [addNotification, stopPolling],
  );

  useEffect(() => {
    pollRef.current = poll;
  }, [poll]);

  const startGeneration = useCallback(
    (storyId) => {
      if (activeStory.current === storyId) return;

      stopPolling();
      activeStory.current = storyId;
      setJob({ storyId, stage: 0, status: 'running' });
      poll(storyId);
    },
    [poll, stopPolling],
  );

  // 새로고침했거나 다른 화면에서 돌아왔을 때, 만드는 중인 동화가 있으면 다시 따라가요.
  const resumeGeneration = useCallback(async () => {
    if (activeStory.current !== null) return;

    try {
      const home = await getHome();
      const running = (home.inProgress ?? []).find((story) => GENERATING_STATUSES.includes(story.status));
      if (running) startGeneration(running.id);
    } catch {
      // 로그인하지 않았거나 서버에 닿지 않으면 따라갈 동화가 없는 걸로 해요.
    }
  }, [startGeneration]);

  const value = useMemo(() => ({ job, startGeneration, resumeGeneration }), [job, startGeneration, resumeGeneration]);

  return <StoryGenerationContext.Provider value={value}>{children}</StoryGenerationContext.Provider>;
}
