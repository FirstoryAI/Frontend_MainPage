import { useEffect, useState } from 'react';

// 책장 넘기는 효과가 도는 시간이에요. (랜딩페이지 샘플 동화책과 같아요)
const PAGE_TURN_MS = 620;

// 쪽(page, 1부터)이 바뀌면 이전 쪽 그림으로 넘기는 효과 정보 { source, direction, key }를 돌려주고, 끝나면 null이에요.
// sources: 쪽 순서대로의 그림 주소 목록
export function usePageTurn(page, sources) {
  const [shownPage, setShownPage] = useState(page);
  const [turn, setTurn] = useState(null);
  const [turnCount, setTurnCount] = useState(0);

  // 쪽이 바뀌는 그 렌더에서 바로 효과 정보를 만들어, 새 쪽이 먼저 한 프레임 보이는 일이 없게 해요.
  if (page !== shownPage) {
    setShownPage(page);
    setTurnCount(turnCount + 1);
    setTurn({
      source: sources[shownPage - 1] ?? null,
      direction: page > shownPage ? 'next' : 'prev',
      key: turnCount + 1,
    });
  }

  useEffect(() => {
    if (!turn) return undefined;

    const timer = window.setTimeout(() => setTurn(null), PAGE_TURN_MS + 40);
    return () => window.clearTimeout(timer);
  }, [turn]);

  return turn;
}
