import { getHome } from '../../services/homeApi';
import { getStories } from '../../services/libraryApi';

export const FREE_STORY_LIMIT = 2;

const USED_STATUSES = new Set([
  'REQUESTED', 'GENERATING_TEXT', 'GENERATING_IMAGES', 'REVIEWING', 'COMPLETED', 'FAILED',
]);

export async function getFreeStoryRemaining() {
  const home = await getHome();
  if (Number.isInteger(home.freeStoryRemaining)) {
    return Math.max(0, Math.min(FREE_STORY_LIMIT, home.freeStoryRemaining));
  }

  // 구형 서버 응답에서는 계정의 동화 목록으로 이미 생성한 횟수를 계산해요.
  let page = 0;
  let used = 0;
  let hasNext = true;
  while (hasNext && used < FREE_STORY_LIMIT) {
    const result = await getStories({ filter: 'ALL', page, size: 50 });
    used += (result.items ?? []).filter((story) => USED_STATUSES.has(story.status)).length;
    hasNext = Boolean(result.hasNext);
    page += 1;
  }
  return Math.max(0, FREE_STORY_LIMIT - used);
}
