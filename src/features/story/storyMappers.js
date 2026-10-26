// 화면에서 쓰는 값(한글 문구·연/월 선택)과 API 코드(FRIEND_CONFLICT, 2022-05 …)를 서로 바꿔 줘요.
// 화면의 '어떤 일인가요?' → API category
const CATEGORY_CODES = {
  '친구 관계': 'FRIEND_CONFLICT',
  '등원 · 적응': 'NEW_ENVIRONMENT',
  '가족': 'FAMILY_CHANGE',
  '떼쓰기 · 훈육': 'RULES',
  '이별 · 죽음': 'SEPARATION',
  '그 밖의 일': 'OTHER',
};

const CATEGORY_LABELS = Object.fromEntries(Object.entries(CATEGORY_CODES).map(([label, code]) => [code, label]));
// 화면에 없는 API 분류는 가장 가까운 화면 분류로 보여줘요.
CATEGORY_LABELS.SAFETY = '그 밖의 일';
CATEGORY_LABELS.FEAR = '그 밖의 일';

const TRAIT_CODES = {
  '마음이 여려요': 'SENSITIVE',
  '낯선 곳에 시간이 걸려요': 'CAUTIOUS',
  '수줍음이 많아요': 'SHY',
  '활발해요': 'ACTIVE',
  '호기심이 많아요': 'CURIOUS',
  '고집이 있어요': 'STUBBORN',
};
const TRAIT_LABELS = Object.fromEntries(Object.entries(TRAIT_CODES).map(([label, code]) => [code, label]));

const GENDER_CODES = { 남자아이: 'MALE', 여자아이: 'FEMALE', '밝히지 않을래요': 'UNSPECIFIED' };
const GENDER_LABELS = Object.fromEntries(Object.entries(GENDER_CODES).map(([label, code]) => [code, label]));

// 화면의 '좋아하는 것'에 적은 말이 아래 단어와 같으면 API의 정해진 코드로 보내요.
const DEFAULT_INTERESTS = [
  ['DINOSAUR', '공룡'],
  ['SPACE', '우주'],
  ['ANIMAL', '동물'],
  ['VEHICLE', '탈것'],
  ['PRINCESS', '공주'],
  ['HERO', '영웅'],
  ['DRAWING', '그림 그리기'],
];

export const SITUATION_TIMING = { past: 'PAST', upcoming: 'UPCOMING', proactive: 'UPCOMING' };

// '그 밖의 일'(OTHER)을 고르면 서버가 분류를 직접 적어 달라고 해요(customCategory 필수).
// 화면에는 분류를 적는 칸이 없어서, 적어 준 상황의 앞부분을 분류로 보내요.
const CUSTOM_CATEGORY_MAX = 30;

export function toSituationRequest(situation, detail) {
  const reaction = detail.reaction.trim();
  const description = detail.event.trim();
  const category = CATEGORY_CODES[detail.category] ?? 'OTHER';
  return {
    // API에는 '먼저 알려주고 싶은 일'이 따로 없어서 '앞으로 겪을 일'과 같이 보내요.
    timing: SITUATION_TIMING[situation] ?? 'PAST',
    category,
    ...(category === 'OTHER' ? { customCategory: description.slice(0, CUSTOM_CATEGORY_MAX) } : {}),
    description,
    reactions: reaction ? ['OTHER'] : [],
    ...(reaction ? { customReaction: reaction } : {}),
    emotions: [],
  };
}

export function toBirthYm(child) {
  return `${child.birthYear}-${String(child.birthMonth).padStart(2, '0')}`;
}

export function toChildProfile(child, interests = DEFAULT_INTERESTS) {
  const traits = child.traits.map((trait) => TRAIT_CODES[trait]).filter(Boolean);
  const customTrait = child.customTrait.trim();
  if (customTrait) traits.push('OTHER');

  const interestCodes = [];
  const customInterests = [];
  child.likes
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => {
      const known = interests.find(([, label]) => label === item);
      if (known) interestCodes.push(known[0]);
      else customInterests.push(item);
    });

  return {
    birthYm: toBirthYm(child),
    gender: GENDER_CODES[child.gender] ?? 'UNSPECIFIED',
    traits,
    ...(customTrait ? { customTrait } : {}),
    interestCodes,
    customInterests,
  };
}

// 서버의 아이 정보(ChildResponse·ChildInfo)를 화면 상태로 바꿔요.
export function fromChild(serverChild, interests = DEFAULT_INTERESTS) {
  if (!serverChild) return null;

  let birthYear = '';
  let birthMonth = '';
  if (serverChild.birthYm) {
    const [year, month] = serverChild.birthYm.split('-').map(Number);
    birthYear = year;
    birthMonth = month;
  } else if (Number.isFinite(serverChild.ageMonths)) {
    // birthYm이 없으면 나이(개월)로 어림해요.
    const now = new Date();
    const months = now.getFullYear() * 12 + now.getMonth() - serverChild.ageMonths;
    birthYear = Math.floor(months / 12);
    birthMonth = (months % 12) + 1;
  }

  const labelOf = (code) => interests.find(([candidate]) => candidate === code)?.[1] ?? code;

  return {
    birthYear,
    birthMonth,
    gender: GENDER_LABELS[serverChild.gender] ?? '',
    traits: (serverChild.traits ?? []).filter((trait) => trait !== 'OTHER').map((trait) => TRAIT_LABELS[trait]).filter(Boolean),
    customTrait: serverChild.customTrait ?? '',
    likes: [...(serverChild.interestCodes ?? []).map(labelOf), ...(serverChild.customInterests ?? [])].join(', '),
  };
}

export function fromSituationTiming(timing) {
  return timing === 'UPCOMING' ? 'upcoming' : 'past';
}

export function fromCategory(category) {
  return CATEGORY_LABELS[category] ?? '그 밖의 일';
}

// 서버의 interest 선택지(code, label)를 [[code, label]]로 바꿔요.
export function interestPairs(options) {
  return options?.interests?.length ? options.interests.map(({ code, label }) => [code, label]) : DEFAULT_INTERESTS;
}

// 동화 생성 단계(1 이야기 짜기, 2 글 쓰기, 3 그림 그리기, 4 책으로 묶기) → 로딩 화면 단계(0~2)
export function toLoadingStage(stage) {
  return Math.min(Math.max((stage ?? 1) - 1, 0), 2);
}

export const GENERATING_STATUSES = ['REQUESTED', 'GENERATING_TEXT', 'GENERATING_IMAGES'];
export const CREATING_STATUSES = ['DRAFT', 'INTERVIEWING', 'CONFIRMING', ...GENERATING_STATUSES];

// 서재 카드가 어느 묶음인지 정해요. (API는 COMPLETED 하나로 보내고 label로 읽음 여부를 알려줘요)
export function libraryGroup(story) {
  const status = String(story.status ?? '').toUpperCase();
  if (CREATING_STATUSES.includes(status)) return 'CREATING';
  if (status === 'REVIEWING') return 'REVIEWING';
  if (status === 'FAILED') return 'FAILED';
  if (status === 'COMPLETED') return story.label?.includes('함께') ? 'READ' : 'UNREAD';
  return status;
}
