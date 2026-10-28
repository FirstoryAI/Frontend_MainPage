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
// 채팅(715)은 Figma 값이고, 이야기(600)는 디자인에 값이 없어 이전 단계보다 더 차게 잡았어요. 동화 만드는 중 화면은 진행 바가 없어요.
const PROGRESS_TRACK = 862;
export const progressByStep = [160, 291, 460, 600, 715, 862].map(
  (width) => width / PROGRESS_TRACK,
);

// 분위기 선택 단계(ST-04)는 지금 단계와 다음 단계 사이에 끼어들어요. 디자인(628:1624)의 바는 첫 단계 값 그대로라서,
// 실제 위치인 두 단계의 가운데로 채워요. (예: 상황 입력 다음이면 상황 입력과 아이 정보 사이)
export const toneProgress = (step) =>
  (progressByStep[step] + (progressByStep[step + 1] ?? progressByStep[step])) / 2;

export const SUMMARY_FALLBACK_GOAL = 'FIRSTORY AI와 함께 이야기를 정리해 볼게요.';
