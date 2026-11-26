// 화면에서 쓰는 값(한글 문구·연/월 선택)과 API 코드(FRIEND_CONFLICT, 2022-05 …)를 서로 바꿔 줘요.
import { OTHER_CORE_VALUE, categories, categoryDisplayNames, educationTopics } from './constants.js';

// '먼저 알려주고 싶은 일'에서 서버로 보낼 핵심 가치와 더 전할 말이에요.
// '기타'를 고르면 아래 칸에 적은 말이 핵심 가치가 되고, 더 전할 말은 없어요.
export function educationValueOf(detail) {
  if (detail.coreValue === OTHER_CORE_VALUE) {
    return { value: detail.event.replace(/\s+/g, ' ').trim(), message: '' };
  }
  return { value: detail.coreValue, message: detail.event.trim() };
}
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
  const isEducation = situation === 'proactive';
  const education = isEducation ? educationValueOf(detail) : null;
  const description = isEducation
    ? `교육 주제: ${detail.category}\n핵심 가치: ${education.value}${education.message ? `\n${education.message}` : ''}`
    : detail.event.trim();
  const category = isEducation ? 'OTHER' : (CATEGORY_CODES[detail.category] ?? 'OTHER');
  const timing = SITUATION_TIMING[situation] ?? 'PAST';
  // 아이의 반응은 '있었던 일'에서만 받아요. 앞으로 겪을 일에 보내면 서버가 400(MOMENT_ONLY_FOR_PAST)으로 막아요.
  const sendReaction = timing === 'PAST' && Boolean(reaction);
  return {
    // API에는 '먼저 알려주고 싶은 일'이 따로 없어서 '앞으로 겪을 일'과 같이 보내요.
    timing,
    category,
    ...(category === 'OTHER' ? { customCategory: (isEducation ? `교육 · ${detail.category}` : description).slice(0, CUSTOM_CATEGORY_MAX) } : {}),
    description,
    reactions: sendReaction ? ['OTHER'] : [],
    ...(sendReaction ? { customReaction: reaction } : {}),
    emotions: [],
  };
}

export function fromDraftSituation(serverSituation, fallbackEvent = '', parentMessage = '') {
  const description = serverSituation?.description ?? fallbackEvent;
  const match = /^교육 주제: ([^\n]+)\n핵심 가치: ([^\n]+)(?:\n([\s\S]*))?$/.exec(description);
  if (match && educationTopics[match[1]]?.includes(match[2])) {
    return {
      situation: 'proactive',
      detail: { category: match[1], coreValue: match[2], event: match[3] ?? '', reaction: '' },
    };
  }
  // 칩에 없는 핵심 가치는 '기타'로 직접 적은 말이에요.
  if (match && educationTopics[match[1]]) {
    return {
      situation: 'proactive',
      detail: { category: match[1], coreValue: OTHER_CORE_VALUE, event: match[2], reaction: '' },
    };
  }
  const categoryLabel = serverSituation?.categoryLabel ?? '';
  const educationCategory = /^교육 · (.+)$/.exec(categoryLabel)?.[1]
    ?? (educationTopics[categoryLabel]?.some(
      (value) => parentMessage === value || parentMessage.startsWith(`${value}: `),
    ) ? categoryLabel : null);
  if (educationCategory && educationTopics[educationCategory]) {
    const coreValue = educationTopics[educationCategory].find(
      (value) => parentMessage === value || parentMessage.startsWith(`${value}: `),
    ) ?? '';
    // 칩에 없는 말이면 '기타'로 직접 적은 핵심 가치예요.
    if (!coreValue && parentMessage.trim()) {
      return {
        situation: 'proactive',
        detail: { category: educationCategory, coreValue: OTHER_CORE_VALUE, event: parentMessage.trim(), reaction: '' },
      };
    }
    return {
      situation: 'proactive',
      detail: {
        category: educationCategory,
        coreValue,
        event: coreValue ? parentMessage.slice(coreValue.length).replace(/^: /, '') : '',
        reaction: '',
      },
    };
  }
  return {
    situation: fromSituationTiming(serverSituation?.timing),
    detail: {
      category: fromCategory(serverSituation?.category),
      coreValue: '',
      event: description,
      reaction: '',
    },
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

// 서재에서는 동화 만들기의 세부 분류를 더 큰 주제로 묶어서 보여줘요.
export const LIBRARY_TOPICS = categories.map((category) => categoryDisplayNames[category]);
const OTHER_TOPIC = '기타';
// 서재 목록은 분류 코드 없이 서버 문구(categoryLabel)만 줄 수도 있어요.
// 교육 주제는 OTHER 코드로 저장되므로 categoryLabel을 먼저 확인해요.
const TOPIC_BY_LABEL = {
  '친구 관계': '친구',
  '친구와 다툼': '친구',
  '등원 · 적응': '첫 경험',
  '새로운 환경': '첫 경험',
  '처음': '첫 경험',
  '처음이라': '첫 경험',
  '가족의 변화': '가족',
  '가족': '가족',
  '떼쓰기 · 훈육': '교육·훈육',
  '규칙': '교육·훈육',
  '이별 · 죽음': '이별',
  '이별': '이별',
  '그 밖의 일': '기타',
  ...Object.fromEntries(LIBRARY_TOPICS.map((topic) => [topic, topic])),
};
const compact = (text) => String(text ?? '').replace(/\s+/g, '');
const EDUCATION_TOPIC_LABELS = new Set(Object.keys(educationTopics).map(compact));
const TOPIC_BY_COMPACT_LABEL = Object.fromEntries(
  Object.entries(TOPIC_BY_LABEL).map(([label, topic]) => [compact(label), topic]),
);

export function libraryTopic(story) {
  const label = compact(story.categoryLabel);
  if (/^교육[·.]/.test(label) || EDUCATION_TOPIC_LABELS.has(label)) {
    return '교육·훈육';
  }
  const code = story.category ?? story.situationCategory ?? story.situation?.category;
  if (code && CATEGORY_LABELS[code]) return TOPIC_BY_COMPACT_LABEL[compact(CATEGORY_LABELS[code])] ?? OTHER_TOPIC;
  return TOPIC_BY_COMPACT_LABEL[label] ?? OTHER_TOPIC;
}

// 서재 카드가 어느 묶음인지 정해요. (API는 COMPLETED 하나로 보내고 label로 읽음 여부를 알려줘요)
export function libraryGroup(story) {
  const status = String(story.status ?? '').toUpperCase();
  if (CREATING_STATUSES.includes(status)) return 'CREATING';
  if (status === 'REVIEWING') return 'REVIEWING';
  if (status === 'FAILED') return 'FAILED';
  if (status === 'COMPLETED') return story.label?.includes('함께') ? 'READ' : 'UNREAD';
  return status;
}
