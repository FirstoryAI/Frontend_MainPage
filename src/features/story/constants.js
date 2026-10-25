export const situations = [
  {
    id: 'past',
    title: '이미 있었던 일이에요',
    description: ['친구와 다툼, 등원 거부처럼 아이가 겪은 일'],
  },
  {
    id: 'upcoming',
    title: '앞으로 겪을 일이에요',
    description: ['첫 등원, 이사, 동생이 생기는 일처럼', '미리 준비할 일'],
  },
  {
    id: 'proactive',
    title: '먼저 알려주고 싶은 일이에요',
    description: ['낯선 사람, 몸의 경계처럼 미리', '나누고 싶은 주제'],
  },
];

export const categories = [
  '친구 관계',
  '등원 · 적응',
  '가족',
  '떼쓰기 · 훈육',
  '이별 · 죽음',
  '그 밖의 일',
];

export const genders = ['남자아이', '여자아이', '밝히지 않을래요'];

export const traits = [
  '마음이 여려요',
  '낯선 곳에 시간이 걸려요',
  '수줍음이 많아요',
  '활발해요',
  '호기심이 많아요',
  '고집이 있어요',
];

const thisYear = new Date().getFullYear();

// 만 12세 이하 아이를 기준으로 한 출생 연도 선택지 (최신 연도부터)
export const birthYears = Array.from({ length: 13 }, (_, index) => thisYear - index);

export const birthMonths = Array.from({ length: 12 }, (_, index) => index + 1);

// 단계 순서: 상황 → 설명 → 아이 정보 → 이야기 → 채팅 → 마무리 → 동화 만드는 중 → 제작 완료
export const STEP = {
  SITUATION: 0,
  DETAIL: 1,
  CHILD: 2,
  TOPIC: 3,
  CHAT: 4,
  SUMMARY: 5,
  GENERATING: 6,
  COMPLETE: 7,
};

// 헤더 진행 바 채움 길이(트랙 862px 기준). 상황·설명·아이 정보·마무리는 Figma 값이고,
// 이야기·채팅은 디자인에 값이 없어 이전 단계보다 더 차게 잡았어요. 동화 만드는 중 화면은 진행 바가 없어요.
const PROGRESS_TRACK = 862;
export const progressByStep = [160, 291, 460, 600, 740, 862].map(
  (width) => width / PROGRESS_TRACK,
);

export const SUMMARY_FALLBACK_GOAL = 'FIRSTORY AI와 함께 이야기를 정리해 볼게요.';

// 동화 제목은 생성 결과가 연결되기 전까지 보여줄 임시 제목이에요. (제작 완료 화면의 표지 이미지와 같은 이야기)
export const STORY_TITLE_PLACEHOLDER = '토리와 빨간 블록';
