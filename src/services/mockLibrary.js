// 개발 중 서재 화면을 서버·로그인 없이 확인하려고 쓰는 예시 데이터예요.
// .env에 VITE_MOCK_LIBRARY=true를 넣으면 libraryApi·homeApi가 서버 대신 이 데이터를 돌려줘요.
export const MOCK_LIBRARY_ENABLED = import.meta.env.VITE_MOCK_LIBRARY === 'true';

const OCTOBER_SIXTH = '2026-10-06T09:00:00+09:00';

// 상태마다 동화가 하나씩 있어요. (제작 중 · 확인을 기다려요 · 아직 읽지 않았어요 · 함께 읽었어요 · 만들지 못했어요)
const mockStories = [
  {
    id: 101,
    title: '공룡 아로의 새 친구',
    status: 'CREATING',
    label: '제작 중 · 그림 그리기',
    childDisplayName: '친구 관계',
    updatedAt: new Date().toISOString(),
  },
  { id: 102, title: '이삿짐 상자 속 별', status: 'REVIEWING', childDisplayName: '이사', updatedAt: OCTOBER_SIXTH },
  { id: 103, title: '이삿짐 상자 속 별', status: 'UNREAD', childDisplayName: '이사', updatedAt: OCTOBER_SIXTH },
  { id: 104, title: '이삿짐 상자 속 별', status: 'READ', childDisplayName: '이사', updatedAt: OCTOBER_SIXTH },
  { id: 105, title: '이삿짐 상자 속 별', status: 'FAILED', childDisplayName: '이사', updatedAt: OCTOBER_SIXTH },
];

export function getMockStories({ filter = 'ALL', page = 0, size = 20 } = {}) {
  const matching = filter === 'ALL' ? mockStories : mockStories.filter((story) => story.status === filter);
  const start = page * size;
  return {
    items: matching.slice(start, start + size),
    page,
    size,
    totalElements: matching.length,
    hasNext: start + size < matching.length,
  };
}

export function getMockHome() {
  const count = (status) => mockStories.filter((story) => story.status === status).length;
  return {
    onboardingSeen: true,
    inProgress: [],
    recent: [],
    counts: {
      all: mockStories.length,
      creating: count('CREATING'),
      reviewing: count('REVIEWING'),
      unread: count('UNREAD'),
      read: count('READ'),
      failed: count('FAILED'),
    },
  };
}
