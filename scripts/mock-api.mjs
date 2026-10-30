// FIRSTORY API 명세(/v3/api-docs)를 따라 하는 개발용 가짜 서버예요. 서버·실제 계정 없이 화면 전체 흐름을 확인할 때 써요.
//
//   npm run mock-api          서버만 실행 (기본 포트 8787)
//   npm run dev:mock          가짜 서버 + 프론트 개발 서버를 함께 실행
//
// 처음엔 동화가 하나도 없어요. 실제처럼 직접 만들어야 생겨요.
// 상태별 예시 동화(제작 중·확인을 기다려요·읽음·실패)가 필요하면 --seed로 실행하세요.
//
// - 데이터는 메모리에만 있어서 서버를 끄면 사라져요.
// - 휴대폰 인증번호는 항상 000000이고, 이메일·비밀번호는 아무 값이나 돼요.
// - 동화 만들기는 약 11초(단계당 3초)만에 끝나요. MOCK_STAGE_MS로 바꿀 수 있어요.
// - 글에 "이별"이 들어가면 분위기 선택 요구(CHOOSE_TONE), "위기"가 들어가면 다시 쓰기 안내(ASK_REVISE), "자해"가 들어가면 차단(BLOCK, 입력 단계),
//   상황 설명에 "실패테스트"가 들어가면 만드는 중에 실패해요(화면 없이 서재로 가요).
// - 상황 설명에 "유사테스트"가 들어가면 동화 만들기를 처음 누를 때 409 DUPLICATE_STORY(이전 동화와 비슷)가 오고, 다시 누르면 진행돼요.
// - 상황 설명에 "검토차단"이 들어가면 동화 만들기를 누르는 순간 409 STORY_BLOCKED, "생성차단"이 들어가면 만드는 중에 BLOCKED가 돼요.
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const STAGE_MS = Number(process.env.MOCK_STAGE_MS) || 3000;
// 입력을 고칠 수 있는 상태예요. 인터뷰를 마친 뒤(생성 전 확인)에도 고칠 수 있어요.
const EDITABLE = ['DRAFT', 'CONFIRMING'];
const CREATING = ['DRAFT', 'INTERVIEWING', 'CONFIRMING', 'REQUESTED', 'GENERATING_TEXT', 'GENERATING_IMAGES'];
const GENERATING = ['REQUESTED', 'GENERATING_TEXT', 'GENERATING_IMAGES'];
const CATEGORY_LABELS = {
  FRIEND_CONFLICT: '친구 관계',
  NEW_ENVIRONMENT: '새로운 환경',
  SEPARATION: '이별',
  SAFETY: '안전',
  RULES: '규칙·훈육',
  FAMILY_CHANGE: '가족 변화',
  FEAR: '두려움',
  OTHER: '그 밖의 일',
};
const STORY_TITLES = {
  FRIEND_CONFLICT: '토리와 빨간 블록',
  NEW_ENVIRONMENT: '새 유치원에 간 곰돌이',
  SEPARATION: '안녕, 구름 친구',
  SAFETY: '토리의 용감한 약속',
  RULES: '약속을 지킨 아기 여우',
  FAMILY_CHANGE: '이삿짐 상자 속 별',
  FEAR: '깜깜한 밤의 반딧불이',
  OTHER: '토리의 하루',
};
const PAGE_LINES = [
  ['자유놀이 시간이다!', '토리는 좋아하는 블록 놀이 자리로 향했어요.'],
  ['그때 같은 반 친구가 다가왔어요.', '“우와, 멋지다! 나도 같이 만들어도 돼?”'],
  ['친구는 토리 옆에 있던 빨간 블록 하나를 집었어요.', '토리는 빨간 블록을 가만히 바라보았어요.'],
  ['친구는 빨간 블록을 내려놓았어요.', '“알겠어…”'],
  ['집에 돌아온 뒤에도 토리는 자꾸 생각났어요.', '혼자 놀고 싶었던 마음도 진짜였어요.'],
  ['다음 날, 토리는 다시 블록 놀이 자리로 갔어요.', '토리는 어떻게 했을까요?'],
  ['토리는 친구에게 먼저 다가갔어요.', '“우리 같이 집을 만들어 볼래?”'],
  ['둘이 함께 만든 집에는 멋진 지붕이 생겼어요.', '마음도 조금씩 편안해졌어요.'],
  ['토리의 가슴이 **콩닥콩닥** 뛰었어요.', '이제 친구와 같이 놀아도 괜찮을 것 같았어요.'],
  ['토리는 오늘 있었던 일을 엄마에게 이야기했어요.', '엄마는 토리의 마음을 가만히 들어 주었어요.'],
];
// 질문마다 보여줄 답변 후보예요. (실제 서버가 후보를 주면 같은 모양으로 오게 될 거예요)
const INTERVIEW_CHOICES = [
  ['마음을 먼저 다독여 주고 싶어요', '다른 친구와도 지낼 수 있다고 알려 주고 싶어요', '둘 다 마음에 걸려요'],
  ['속상한 마음을 알아줬으면 좋겠어요', '괜찮다고 느꼈으면 좋겠어요'],
];
const INTERVIEW_QUESTIONS = [
  '그 일이 있고 나서 아이가 가장 많이 한 말은 무엇이었나요?',
  '아이가 이 이야기를 듣고 어떤 마음이 들면 좋겠어요?',
];

const users = new Map();
const sessions = new Map();
const verifications = new Map();
let nextId = 1;
let pendingSeed = false;

const now = () => new Date().toISOString();
const id = () => nextId++;

function json(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(body === undefined ? '' : JSON.stringify(body));
}

const empty = (res, status = 204, headers = {}) => {
  res.writeHead(status, headers);
  res.end();
};

const error = (res, status, code, message) => json(res, status, { code, message });

const invalid = (res, fields) =>
  json(res, 400, {
    code: 'VALIDATION_FAILED',
    message: '입력값을 확인해 주세요.',
    fields: fields.map(([field, message]) => ({ field, message })),
  });

function parseCookies(header = '') {
  return Object.fromEntries(
    header.split(';').map((part) => part.trim().split('=')).filter(([key]) => key).map(([key, ...rest]) => [key, rest.join('=')]),
  );
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ---------- 동화 ----------

function pageSvg(title, pageNo, hue) {
  const label = pageNo === 0 ? title : `${pageNo}쪽`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 580" width="1024" height="580">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="hsl(${hue} 70% 85%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360} 65% 72%)"/></linearGradient></defs>
<rect width="1024" height="580" fill="url(#g)"/>
<circle cx="${200 + pageNo * 70}" cy="380" r="90" fill="hsl(${hue} 60% 55%)" opacity=".75"/>
<rect x="520" y="300" width="220" height="180" rx="16" fill="hsl(${(hue + 200) % 360} 50% 60%)" opacity=".8"/>
<text x="512" y="130" font-size="64" font-family="sans-serif" font-weight="700" text-anchor="middle" fill="#575757">${label}</text>
</svg>`;
}

// 표지는 정사각형이에요. (서재·상세에서 쓰는 coverUrl)
function coverSvg(title, hue) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="hsl(${hue} 70% 82%)"/><stop offset="1" stop-color="hsl(${(hue + 50) % 360} 65% 68%)"/></linearGradient></defs>
<rect width="600" height="600" rx="28" fill="url(#g)"/>
<circle cx="300" cy="360" r="130" fill="hsl(${hue} 60% 55%)" opacity=".7"/>
<text x="300" y="130" font-size="46" font-family="sans-serif" font-weight="700" text-anchor="middle" fill="#575757">${title}</text>
</svg>`;
}

const coverUrl = (story, version) => `/api/stories/${story.id}/versions/${version.id}/character-sheet`;

function makeVersion(story, { scope = 'ALL', parent = null } = {}) {
  const versionNo = story.versions.length + 1;
  const base = STORY_TITLES[story.situation?.category] ?? STORY_TITLES.OTHER;
  const version = {
    id: id(),
    versionNo,
    parentVersionNo: parent,
    title: base,
    scope,
    createdAt: now(),
    hue: (versionNo * 47 + story.id * 29) % 360,
    pages: PAGE_LINES.map((lines, index) => ({ pageNo: index + 1, text: lines.join('\n') })),
  };
  story.versions.push(version);
  story.currentVersionId = version.id;
  return version;
}

function currentVersion(story) {
  return story.versions.find((version) => version.id === story.currentVersionId) ?? story.versions.at(-1);
}

const imageUrl = (story, version, pageNo) => `/api/stories/${story.id}/versions/${version.id}/pages/${pageNo}/image`;

function pageView(story, version) {
  return version.pages.map((page) => ({ ...page, imageStatus: 'DONE', imageUrl: imageUrl(story, version, page.pageNo) }));
}

const STAGE_LABELS = ['', '이야기 짜는 중', '글 쓰는 중', '그림 그리는 중', '책으로 묶는 중'];

function generationOf(story) {
  const gen = story.gen;
  if (!gen) return null;
  const elapsed = Date.now() - gen.startedAt;
  let stage = Math.min(4, Math.floor(elapsed / STAGE_MS) + 1);
  if (gen.holdStage) stage = Math.min(stage, gen.holdStage);
  return { stage, elapsed };
}

// 시간이 지난 만큼 동화 상태를 앞으로 보내요. (서버가 뒤에서 만든다고 가정)
function tick(story) {
  if (!GENERATING.includes(story.status) || !story.gen) return story;
  const { stage, elapsed } = generationOf(story);
  if (story.gen.blockAt && elapsed >= story.gen.blockAt) {
    story.status = 'BLOCKED';
    story.updatedAt = now();
    return story;
  }
  if (story.gen.failAt && elapsed >= story.gen.failAt) {
    story.status = 'FAILED';
    story.gen.error = '동화를 만드는 중 문제가 생겼어요.';
    story.updatedAt = now();
    return story;
  }
  if (!story.gen.holdStage && elapsed >= STAGE_MS * 4) {
    story.status = 'REVIEWING';
    makeVersion(story, { scope: story.gen.scope, parent: story.gen.parentVersionNo ?? null });
    story.updatedAt = now();
    return story;
  }
  story.status = stage <= 1 ? 'REQUESTED' : stage === 2 ? 'GENERATING_TEXT' : 'GENERATING_IMAGES';
  return story;
}

function generationResponse(story) {
  tick(story);
  const view = generationOf(story);
  return {
    storyId: story.id,
    status: story.status,
    runNo: story.gen?.runNo ?? 0,
    stage: story.status === 'REVIEWING' || story.status === 'COMPLETED' ? 4 : (view?.stage ?? 0),
    stageLabel: STAGE_LABELS[view?.stage ?? 0] ?? '',
    startedAt: story.gen ? new Date(story.gen.startedAt).toISOString() : null,
    error: story.status === 'FAILED' ? (story.gen?.error ?? '동화를 만들지 못했어요.') : null,
  };
}

function startGeneration(story, { scope = 'ALL', parentVersionNo = null, failAt = null, holdStage = null } = {}) {
  story.gen = {
    runNo: (story.gen?.runNo ?? 0) + 1,
    startedAt: Date.now(),
    scope,
    parentVersionNo,
    failAt: failAt ?? (story.situation?.description?.includes('실패테스트') ? STAGE_MS * 2 : null),
    blockAt: story.situation?.description?.includes('생성차단') ? STAGE_MS * 2 : null,
    holdStage,
    error: null,
  };
  story.status = 'REQUESTED';
  story.updatedAt = now();
}

function statusLabel(story) {
  const stage = generationOf(story)?.stage ?? 1;
  if (GENERATING.includes(story.status)) return `제작 중 · ${['', '이야기 짜기', '글 쓰기', '그림 그리기', '책 묶기'][stage]}`;
  if (CREATING.includes(story.status)) return '제작 중';
  if (story.status === 'REVIEWING') return '확인을 기다려요';
  if (story.status === 'FAILED') return '만들지 못했어요';
  if (story.status === 'COMPLETED') return story.readCount > 0 ? '함께 읽었어요' : '아직 읽지 않았어요';
  return '';
}

function card(story) {
  tick(story);
  const version = currentVersion(story);
  return {
    id: story.id,
    title: version?.title ?? null,
    status: story.status,
    label: statusLabel(story),
    coverUrl: version ? coverUrl(story, version) : null,
    childDisplayName: story.child?.displayName ?? null,
    createdAt: story.createdAt,
    updatedAt: story.updatedAt,
  };
}

function inGroup(story, filter) {
  tick(story);
  if (story.status === 'BLOCKED') return false;
  switch (filter) {
    case 'CREATING': return CREATING.includes(story.status);
    case 'REVIEWING': return story.status === 'REVIEWING';
    case 'UNREAD': return story.status === 'COMPLETED' && story.readCount === 0;
    case 'READ': return story.status === 'COMPLETED' && story.readCount > 0;
    case 'FAILED': return story.status === 'FAILED';
    default: return true;
  }
}

function counts(user) {
  const stories = [...user.stories.values()];
  const count = (filter) => stories.filter((story) => inGroup(story, filter)).length;
  return {
    creating: count('CREATING'),
    reviewing: count('REVIEWING'),
    unread: count('UNREAD'),
    read: count('READ'),
    failed: count('FAILED'),
  };
}

function safetyCheck(...texts) {
  const text = texts.filter(Boolean).join(' ');
  if (text.includes('자해')) {
    return { action: 'BLOCK', level: 'CRISIS', category: 'SELF_HARM', reason: '도움이 필요한 이야기예요.', helpKind: 'PARENTING' };
  }
  if (text.includes('위기')) {
    return { action: 'ASK_REVISE', level: 'REVISE', category: 'SENSITIVE', reason: '조금 더 부드러운 표현으로 다시 써 주세요.', helpKind: null };
  }
  if (text.includes('이별')) {
    return { action: 'CHOOSE_TONE', level: 'SENSITIVE', category: 'SEPARATION', reason: null, helpKind: null };
  }
  return { action: 'PROCEED', level: 'OK', category: null, reason: null, helpKind: null };
}

function step(story, safety = null, saved = true) {
  return {
    storyId: story.id,
    status: story.status,
    saved,
    safety,
    toneRequired: Boolean(story.toneRequired),
  };
}

function handleSafety(story, safety) {
  if (safety.action === 'BLOCK') {
    story.status = 'BLOCKED';
    return step(story, safety, false);
  }
  if (safety.action === 'ASK_REVISE') return step(story, safety, false);
  if (safety.action === 'CHOOSE_TONE') story.toneRequired = true;
  return null;
}

function interviewResponse(story, extra = {}) {
  const asked = story.interview.turns.length;
  const done = story.interview.turns.filter((turn) => turn.answer !== undefined).length;
  const isConfirm = story.interview.noQuestions || done >= INTERVIEW_QUESTIONS.length;
  if (isConfirm) {
    story.status = 'CONFIRMING';
    story.interview.endReason = 'SUFFICIENT';
    story.interview.summary = story.message
      ? `${story.message} 이야기를 아이와 나누고 싶어요.`
      : '아이의 속상한 마음을 먼저 알아주고, 괜찮다는 걸 함께 느끼는 이야기를 나누고 싶어요.';
  }
  return {
    storyId: story.id,
    status: story.status,
    type: isConfirm ? 'CONFIRM' : 'QUESTION',
    turn: asked,
    question: isConfirm ? null : INTERVIEW_QUESTIONS[done],
    choices: isConfirm ? [] : INTERVIEW_CHOICES[done],
    summary: isConfirm ? story.interview.summary : null,
    contextUpdate: {},
    safety: extra.safety ?? { action: 'PROCEED', level: 'OK', category: null, reason: null, helpKind: null },
    toneRequired: Boolean(story.toneRequired),
  };
}

const CHILD_TRAITS = ['SENSITIVE', 'CAUTIOUS', 'SHY', 'ACTIVE', 'CURIOUS', 'STUBBORN', 'OTHER'];
const GENDERS = ['FEMALE', 'MALE', 'UNSPECIFIED'];

function ageMonths(birthYm) {
  const [year, month] = String(birthYm).split('-').map(Number);
  if (!year || !month) return 0;
  const today = new Date();
  return Math.max(0, (today.getFullYear() - year) * 12 + (today.getMonth() + 1 - month));
}

function childView(child) {
  return { ...child, ageMonths: ageMonths(child.birthYm) };
}

function validateProfile(profile) {
  const fields = [];
  if (!profile || !/^\d{4}-\d{2}$/.test(profile.birthYm ?? '')) fields.push(['birthYm', 'yyyy-MM 형식이어야 해요.']);
  if (!GENDERS.includes(profile?.gender)) fields.push(['gender', '성별을 골라 주세요.']);
  for (const trait of profile?.traits ?? []) if (!CHILD_TRAITS.includes(trait)) fields.push(['traits', '알 수 없는 성향이에요.']);
  if ((profile?.traits ?? []).includes('OTHER') && !profile.customTrait?.trim()) fields.push(['customTrait', '직접 입력한 성향을 적어 주세요.']);
  return fields;
}

function addChild(user, profile) {
  const used = new Set([...user.children.values()].map((child) => child.displayName));
  const letter = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].find((candidate) => !used.has(`아이 ${candidate}`)) ?? '?';
  const child = {
    id: id(),
    displayName: `아이 ${letter}`,
    birthYm: profile.birthYm,
    gender: profile.gender,
    traits: profile.traits ?? [],
    customTrait: (profile.traits ?? []).includes('OTHER') ? (profile.customTrait ?? null) : null,
    interestCodes: profile.interestCodes ?? [],
    customInterests: profile.customInterests ?? [],
  };
  user.children.set(child.id, child);
  return child;
}

function newStory(user, overrides = {}) {
  const story = {
    id: id(),
    status: 'DRAFT',
    createdAt: now(),
    updatedAt: now(),
    situation: null,
    child: null,
    message: null,
    tone: null,
    toneRequired: false,
    interview: { turns: [], summary: null, endReason: null },
    versions: [],
    currentVersionId: null,
    regenerateUsed: 0,
    confirmedAt: null,
    readCount: 0,
    lastReadAt: null,
    gen: null,
    ...overrides,
  };
  user.stories.set(story.id, story);
  return story;
}

function seedStories(user) {
  const child = addChild(user, { birthYm: '2022-04', gender: 'FEMALE', traits: ['SENSITIVE'], interestCodes: ['DINOSAUR'] });
  const base = (category, description, overrides = {}) => newStory(user, {
    situation: { category, categoryLabel: CATEGORY_LABELS[category], timing: 'PAST', description },
    child: { childId: child.id, displayName: child.displayName, ageMonths: ageMonths(child.birthYm), gender: child.gender, traits: child.traits, customTrait: null, interestCodes: child.interestCodes, customInterests: [] },
    ...overrides,
  });

  const creating = base('FRIEND_CONFLICT', '친구가 장난감을 빼앗았어요.');
  startGeneration(creating, { holdStage: 3 });
  creating.gen.startedAt = Date.now() - STAGE_MS * 2;

  const reviewing = base('NEW_ENVIRONMENT', '새 유치원에 가기 싫다고 해요.', { status: 'REVIEWING', confirmedAt: null });
  makeVersion(reviewing);

  const unread = base('FAMILY_CHANGE', '곧 이사를 가요.', { status: 'COMPLETED', confirmedAt: now() });
  makeVersion(unread);

  const read = base('SEPARATION', '친한 친구가 이사를 갔어요.', { status: 'COMPLETED', confirmedAt: now(), readCount: 1, lastReadAt: now() });
  makeVersion(read);

  const failed = base('FEAR', '밤에 혼자 자기 무서워해요.', { status: 'FAILED' });
  startGeneration(failed);
  failed.status = 'FAILED';
  failed.gen.error = '동화를 만드는 중 문제가 생겼어요.';
}

// ---------- 라우터 ----------

function guide(story) {
  const version = currentVersion(story);
  return {
    storyId: story.id,
    title: version.title,
    beforeReading: {
      intent: '정답을 알려 주기보다 아이의 마음을 먼저 들어 보는 시간이에요.',
      tips: ['정답을 말해 주기보다 아이 말을 먼저 들어 주세요.', '아이가 이야기하고 싶어 하지 않으면 그냥 읽고 넘어가도 괜찮아요.'],
    },
    prompts: [2, 4, 6].map((afterPage, index) => ({
      id: story.id * 100 + index + 1,
      seq: index + 1,
      afterPage,
      question: ['토리는 어떤 기분이었을까?', '친구 얼굴은 어땠을까?', '너라면 어떻게 했을 것 같아?'][index],
      purpose: ['empathy', 'perspective', 'connect'][index],
      parentHint: ['정답이 없어요. 아이 말을 그대로 받아 주세요.', '“슬퍼 보였구나”처럼 마음을 말로 받아 주세요.', '대답하지 않아도 괜찮아요.'][index],
    })),
    afterReading: {
      bridgeQuestion: '“너도 친구랑 놀고 싶었는데 속상했던 적 있어?”',
      ifUndecided: '아이의 이야기로 꼭 넘어가지 않아도 괜찮아요.',
    },
  };
}

export function startMockApi({ port = Number(process.env.MOCK_API_PORT) || 8787, seed = false } = {}) {
  pendingSeed = seed;

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;
    const method = req.method;
    const cookies = parseCookies(req.headers.cookie);
    const user = sessions.has(cookies.FSESSION) ? users.get(sessions.get(cookies.FSESSION)) : null;

    if (!path.startsWith('/api/')) return error(res, 404, 'NOT_FOUND', '없는 주소예요.');

    const needsCsrf = !['GET', 'HEAD', 'OPTIONS'].includes(method);
    if (needsCsrf && path !== '/api/auth/csrf' && (!cookies['XSRF-TOKEN'] || req.headers['x-xsrf-token'] !== cookies['XSRF-TOKEN'])) {
      return error(res, 403, 'CSRF_INVALID', 'CSRF 토큰이 올바르지 않아요.');
    }

    const body = needsCsrf ? await readBody(req) : {};
    if (body === null) return error(res, 400, 'MALFORMED_JSON', '요청 형식이 올바르지 않아요.');

    const requireUser = () => {
      if (!user) {
        error(res, 401, 'UNAUTHORIZED', '로그인이 필요해요.');
        return false;
      }
      return true;
    };

    const match = (pattern) => {
      const names = [];
      const regex = new RegExp(`^${pattern.replace(/\{(\w+)\}/g, (_, name) => { names.push(name); return '([^/]+)'; })}$`);
      const found = regex.exec(path);
      return found ? Object.fromEntries(names.map((name, index) => [name, found[index + 1]])) : null;
    };

    // --- 인증 ---
    if (method === 'GET' && path === '/api/health') return json(res, 200, { status: 'ok' });
    if (method === 'GET' && path === '/api/auth/csrf') {
      return empty(res, 204, { 'Set-Cookie': `XSRF-TOKEN=${cookies['XSRF-TOKEN'] ?? randomUUID()}; Path=/; SameSite=Lax` });
    }

    const meView = (account) => ({
      id: account.id,
      email: account.email,
      phoneMasked: `${account.phone.slice(0, 3)}-****-${account.phone.slice(-4)}`,
      onboardingSeen: account.onboardingSeen,
      smsNotify: account.smsNotify,
    });

    const logIn = (account, status) => {
      const sid = randomUUID();
      sessions.set(sid, account.id);
      if (pendingSeed) {
        pendingSeed = false;
        seedStories(account);
      }
      return json(res, status, meView(account), { 'Set-Cookie': `FSESSION=${sid}; Path=/; HttpOnly; SameSite=Lax` });
    };

    if (method === 'POST' && path === '/api/auth/phone/send-code') {
      if (!body.phone) return invalid(res, [['phone', '휴대폰 번호를 입력해 주세요.']]);
      if (body.purpose === 'SIGNUP' && [...users.values()].some((account) => account.phone === body.phone)) {
        return error(res, 409, 'PHONE_ALREADY_REGISTERED', '이미 가입된 번호예요.');
      }
      verifications.set(cookies['XSRF-TOKEN'], { phone: body.phone, purpose: body.purpose, verified: false });
      return json(res, 200, { expiresInSeconds: 180 });
    }
    if (method === 'POST' && path === '/api/auth/phone/verify') {
      const record = verifications.get(cookies['XSRF-TOKEN']);
      if (!record || record.phone !== body.phone) return error(res, 400, 'CODE_NOT_REQUESTED', '인증번호를 먼저 받아 주세요.');
      if (body.code !== '000000') return error(res, 400, 'INVALID_CODE', '인증번호가 맞지 않아요.');
      record.verified = true;
      return empty(res);
    }
    if (method === 'POST' && path === '/api/auth/signup') {
      const record = verifications.get(cookies['XSRF-TOKEN']);
      if (!record?.verified || record.phone !== body.phone) return error(res, 403, 'PHONE_NOT_VERIFIED', '휴대폰 인증을 먼저 마쳐 주세요.');
      if (!body.email || !body.password) return invalid(res, [['email', '이메일과 비밀번호를 입력해 주세요.']]);
      if ([...users.values()].some((account) => account.email === body.email)) return error(res, 409, 'EMAIL_ALREADY_REGISTERED', '이미 가입된 이메일이에요.');
      const account = {
        id: id(), email: body.email, password: body.password, phone: body.phone,
        onboardingSeen: false, smsNotify: Boolean(body.consents?.SMS_NOTIFY),
        stories: new Map(), children: new Map(), readingSessions: new Map(),
      };
      users.set(account.id, account);
      return logIn(account, 201);
    }
    if (method === 'POST' && path === '/api/auth/login') {
      const account = [...users.values()].find((candidate) => candidate.email === body.email);
      if (!account || account.password !== body.password) return error(res, 401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 맞지 않아요.');
      return logIn(account, 200);
    }
    if (method === 'POST' && path === '/api/auth/logout') {
      sessions.delete(cookies.FSESSION);
      return empty(res, 204, { 'Set-Cookie': ['FSESSION=; Path=/; Max-Age=0', 'XSRF-TOKEN=; Path=/; Max-Age=0'] });
    }

    // --- 내 정보 ---
    if (path.startsWith('/api/me')) {
      if (!requireUser()) return undefined;
      if (method === 'GET' && path === '/api/me') return json(res, 200, meView(user));
      if (method === 'POST' && path === '/api/me/onboarding-seen') { user.onboardingSeen = true; return empty(res); }
      if (method === 'PUT' && path === '/api/me/consents/sms-notify') {
        if (typeof body.agreed !== 'boolean') return invalid(res, [['agreed', '동의 여부를 보내 주세요.']]);
        user.smsNotify = body.agreed;
        return empty(res);
      }
      if (method === 'POST' && path === '/api/me/password') {
        if (body.currentPassword !== user.password) return error(res, 403, 'INVALID_PASSWORD', '현재 비밀번호가 맞지 않아요.');
        if (!/^(?=.*[A-Za-z])(?=.*\d).{8,64}$/.test(body.newPassword ?? '')) return invalid(res, [['newPassword', '8~64자, 영문과 숫자를 각각 1개 이상 넣어 주세요.']]);
        user.password = body.newPassword;
        return empty(res);
      }
      if (method === 'POST' && path === '/api/me/phone') {
        if (body.currentPassword !== user.password) return error(res, 403, 'INVALID_PASSWORD', '현재 비밀번호가 맞지 않아요.');
        user.phone = body.phone;
        return empty(res);
      }
      if (method === 'POST' && path === '/api/me/withdraw') {
        if (body.currentPassword !== user.password) return error(res, 403, 'INVALID_PASSWORD', '현재 비밀번호가 맞지 않아요.');
        users.delete(user.id);
        sessions.delete(cookies.FSESSION);
        return empty(res, 204, { 'Set-Cookie': ['FSESSION=; Path=/; Max-Age=0', 'XSRF-TOKEN=; Path=/; Max-Age=0'] });
      }
      return error(res, 404, 'NOT_FOUND', '없는 주소예요.');
    }

    if (!requireUser()) return undefined;

    // --- 아이 프로필 ---
    if (method === 'GET' && path === '/api/children/options') {
      return json(res, 200, {
        traits: [['SENSITIVE', '마음이 여려요'], ['CAUTIOUS', '낯선 곳에 시간이 걸려요'], ['SHY', '수줍음이 많아요'], ['ACTIVE', '활발해요'], ['CURIOUS', '호기심이 많아요'], ['STUBBORN', '고집이 있어요']].map(([code, label]) => ({ code, label })),
        genders: [['FEMALE', '여자아이'], ['MALE', '남자아이'], ['UNSPECIFIED', '밝히지 않을래요']].map(([code, label]) => ({ code, label })),
        interests: [['DINOSAUR', '공룡'], ['SPACE', '우주'], ['ANIMAL', '동물'], ['VEHICLE', '탈것'], ['PRINCESS', '공주'], ['HERO', '영웅'], ['DRAWING', '그림 그리기']].map(([code, label]) => ({ code, label })),
        interestsMax: 5, customTraitMaxLength: 30, customInterestMaxLength: 20,
      });
    }
    if (method === 'GET' && path === '/api/children') return json(res, 200, [...user.children.values()].map(childView));
    if (method === 'POST' && path === '/api/children') {
      const fields = validateProfile(body);
      if (fields.length) return invalid(res, fields);
      return json(res, 201, childView(addChild(user, body)));
    }
    let params = match('/api/children/{id}');
    if (params) {
      const child = user.children.get(Number(params.id));
      if (!child) return error(res, 404, 'CHILD_NOT_FOUND', '아이 프로필을 찾을 수 없어요.');
      if (method === 'GET') return json(res, 200, childView(child));
      if (method === 'PUT') {
        const fields = validateProfile(body);
        if (fields.length) return invalid(res, fields);
        Object.assign(child, {
          birthYm: body.birthYm, gender: body.gender, traits: body.traits ?? [],
          customTrait: (body.traits ?? []).includes('OTHER') ? body.customTrait : null,
          interestCodes: body.interestCodes ?? [], customInterests: body.customInterests ?? [],
        });
        return json(res, 200, childView(child));
      }
      if (method === 'DELETE') { user.children.delete(child.id); return empty(res); }
    }
    params = match('/api/children/{id}/display-name');
    if (params && method === 'PATCH') {
      const child = user.children.get(Number(params.id));
      if (!child) return error(res, 404, 'CHILD_NOT_FOUND', '아이 프로필을 찾을 수 없어요.');
      const name = String(body.displayName ?? '').trim();
      if (name.length < 1 || name.length > 30) return error(res, 400, 'VALIDATION_FAILED', '호칭은 1~30자로 입력해 주세요.');
      child.displayName = name;
      return json(res, 200, childView(child));
    }

    // --- 홈·서재 ---
    if (method === 'GET' && path === '/api/home') {
      const stories = [...user.stories.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      return json(res, 200, {
        onboardingSeen: user.onboardingSeen,
        inProgress: stories.filter((story) => inGroup(story, 'CREATING') || inGroup(story, 'REVIEWING') || inGroup(story, 'FAILED')).slice(0, 3).map(card),
        recent: stories.filter((story) => story.status === 'COMPLETED').slice(0, 3).map(card),
        counts: counts(user),
      });
    }
    if (method === 'GET' && path === '/api/stories') {
      const filter = url.searchParams.get('filter') || 'ALL';
      if (!['ALL', 'CREATING', 'REVIEWING', 'UNREAD', 'READ', 'FAILED'].includes(filter)) return invalid(res, [['filter', '알 수 없는 목록이에요.']]);
      const page = Number(url.searchParams.get('page') || 0);
      const size = Math.min(50, Math.max(1, Number(url.searchParams.get('size') || 20)));
      const all = [...user.stories.values()].filter((story) => inGroup(story, filter)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      return json(res, 200, {
        items: all.slice(page * size, page * size + size).map(card),
        page, size, totalElements: all.length, hasNext: (page + 1) * size < all.length,
      });
    }
    if (method === 'POST' && path === '/api/stories') {
      const story = newStory(user);
      return json(res, 201, { storyId: story.id, status: story.status });
    }

    // --- 읽기 세션 ---
    params = match('/api/reading-sessions/{sessionId}/progress');
    if (params && method === 'PUT') {
      const session = user.readingSessions.get(Number(params.sessionId));
      if (!session) return error(res, 404, 'SESSION_NOT_FOUND', '읽기 세션을 찾을 수 없어요.');
      if (session.done) return error(res, 409, 'INVALID_STATUS_TRANSITION', '이미 끝난 읽기예요.');
      if (!(body.page >= 1 && body.page <= 8)) return invalid(res, [['page', '1~8쪽 사이여야 해요.']]);
      session.lastPage = body.page;
      return empty(res);
    }
    params = match('/api/reading-sessions/{sessionId}/complete');
    if (params && method === 'POST') {
      const session = user.readingSessions.get(Number(params.sessionId));
      if (!session) return error(res, 404, 'SESSION_NOT_FOUND', '읽기 세션을 찾을 수 없어요.');
      if (!session.done) {
        session.done = true;
        const story = user.stories.get(session.storyId);
        story.readCount += 1;
        story.lastReadAt = now();
        story.updatedAt = now();
      }
      return empty(res);
    }
    params = match('/api/reading-sessions/{sessionId}/dialogue/{promptId}');
    if (params && method === 'PUT') {
      const session = user.readingSessions.get(Number(params.sessionId));
      if (!session) return error(res, 404, 'SESSION_NOT_FOUND', '읽기 세션을 찾을 수 없어요.');
      if (!['TALKED', 'SKIPPED'].includes(body.action)) return invalid(res, [['action', 'TALKED 또는 SKIPPED여야 해요.']]);
      session.dialogue[params.promptId] = body.action;
      return empty(res);
    }

    // --- 동화 ---
    params = match('/api/stories/{id}') ?? match('/api/stories/{id}/{section}') ?? match('/api/stories/{id}/{section}/{sub}')
      ?? match('/api/stories/{id}/versions/{versionId}/pages/{pageNo}/image') ?? match('/api/stories/{id}/versions/{versionId}/character-sheet');
    if (!params) return error(res, 404, 'NOT_FOUND', '없는 주소예요.');

    const story = user.stories.get(Number(params.id));
    if (!story) return error(res, 404, 'STORY_NOT_FOUND', '동화를 찾을 수 없어요.');
    tick(story);
    const section = params.section;
    const sub = params.sub;
    const conflict = (message = '지금은 할 수 없는 단계예요.') => error(res, 409, 'INVALID_STATUS_TRANSITION', message);

    if (path.endsWith('/image') || path.endsWith('/character-sheet')) {
      const version = story.versions.find((candidate) => candidate.id === Number(params.versionId));
      if (!version) return error(res, 404, 'IMAGE_NOT_FOUND', '그림을 찾을 수 없어요.');
      res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' });
      return res.end(path.endsWith('/image') ? pageSvg(version.title, Number(params.pageNo), version.hue) : coverSvg(version.title, version.hue));
    }

    if (!section) {
      if (method === 'GET') {
        const version = currentVersion(story);
        return json(res, 200, {
          id: story.id,
          title: version?.title ?? null,
          status: story.status,
          label: statusLabel(story),
          coverUrl: version ? coverUrl(story, version) : null,
          childDisplayName: story.child?.displayName ?? null,
          situation: story.situation ? { category: story.situation.category, categoryLabel: story.situation.categoryLabel, timing: story.situation.timing } : null,
          summary: story.interview.summary ?? story.situation?.description ?? null,
          pageCount: version?.pages.length ?? 0,
          createdAt: story.createdAt,
          confirmedAt: story.confirmedAt,
          readCount: story.readCount,
          lastReadAt: story.lastReadAt,
          canRead: story.status === 'COMPLETED',
        });
      }
      if (method === 'DELETE') {
        if (GENERATING.includes(story.status)) return conflict('만드는 중인 동화는 지울 수 없어요.');
        user.stories.delete(story.id);
        return empty(res);
      }
    }

    if (method === 'PUT' && section === 'situation') {
      if (!EDITABLE.includes(story.status)) return conflict();
      const fields = [];
      if (!CATEGORY_LABELS[body.category]) fields.push(['category', '어떤 일인지 골라 주세요.']);
      if (!['PAST', 'UPCOMING'].includes(body.timing)) fields.push(['timing', '언제 일인지 골라 주세요.']);
      if (body.timing === 'UPCOMING' && ((body.reactions?.length ?? 0) > 0 || (body.emotions?.length ?? 0) > 0 || body.customReaction)) return json(res, 400, { code: 'MOMENT_ONLY_FOR_PAST', message: '아이의 반응과 감정은 있었던 일에서만 고를 수 있어요.' });
      if (body.category === 'OTHER' && !body.customCategory?.trim()) return json(res, 400, { code: 'VALIDATION_FAILED', message: '기타를 고르면 내용을 직접 입력해 주세요.' });
      if (fields.length) return invalid(res, fields);
      const safety = safetyCheck(body.description, body.customCategory, body.customReaction);
      const blocked = handleSafety(story, safety);
      if (blocked) return json(res, 200, blocked);
      story.situation = {
        timing: body.timing, category: body.category, categoryLabel: CATEGORY_LABELS[body.category],
        customCategory: body.customCategory ?? null, description: body.description ?? '',
        reactions: body.reactions ?? [], customReaction: body.customReaction ?? null, emotions: body.emotions ?? [],
      };
      story.updatedAt = now();
      return json(res, 200, step(story, safety));
    }
    if (method === 'PUT' && section === 'child') {
      if (!EDITABLE.includes(story.status)) return conflict();
      let profile = body.profile;
      if (body.childId) {
        const saved = user.children.get(Number(body.childId));
        if (!saved) return error(res, 404, 'CHILD_NOT_FOUND', '아이 프로필을 찾을 수 없어요.');
        profile = { ...saved, ...(body.profile ?? {}) };
      }
      const fields = validateProfile(profile);
      if (fields.length) return invalid(res, fields);
      const safety = safetyCheck(profile.customTrait, ...(profile.customInterests ?? []));
      const blocked = handleSafety(story, safety);
      if (blocked) return json(res, 200, blocked);
      let saved = body.childId ? user.children.get(Number(body.childId)) : null;
      if (body.saveForNextTime) {
        if (saved) Object.assign(saved, { birthYm: profile.birthYm, gender: profile.gender, traits: profile.traits ?? [], customTrait: profile.customTrait ?? null, interestCodes: profile.interestCodes ?? [], customInterests: profile.customInterests ?? [] });
        else saved = addChild(user, profile);
      }
      story.child = {
        childId: saved?.id ?? null,
        displayName: saved?.displayName ?? '아이',
        ageMonths: ageMonths(profile.birthYm),
        gender: profile.gender, traits: profile.traits ?? [], customTrait: profile.customTrait ?? null,
        interestCodes: profile.interestCodes ?? [], customInterests: profile.customInterests ?? [],
      };
      story.updatedAt = now();
      return json(res, 200, step(story, safety));
    }
    if (method === 'PUT' && section === 'summary') {
      if (story.status !== 'CONFIRMING') return conflict();
      const summary = body.summary?.trim() ?? '';
      if (!summary || summary.length > 300) return invalid(res, [['summary', '나누고 싶은 것은 1~300자로 입력해 주세요.']]);
      const safety = safetyCheck(summary);
      const blocked = handleSafety(story, safety);
      if (blocked) return json(res, 200, blocked);
      story.interview.summary = summary;
      story.updatedAt = now();
      return json(res, 200, step(story, safety));
    }
    if (method === 'PUT' && section === 'message') {
      if (!EDITABLE.includes(story.status)) return conflict();
      const safety = safetyCheck(body.message);
      const blocked = handleSafety(story, safety);
      if (blocked) return json(res, 200, blocked);
      story.message = body.message?.trim() ? body.message.trim() : null;
      story.updatedAt = now();
      return json(res, 200, step(story, safety));
    }
    if (method === 'PUT' && section === 'tone') {
      if (!['DRAFT', 'INTERVIEWING', 'CONFIRMING'].includes(story.status)) return conflict();
      if (!['PLAIN', 'WARM', 'UNDECIDED'].includes(body.tone)) return invalid(res, [['tone', '분위기를 골라 주세요.']]);
      story.tone = body.tone;
      story.toneRequired = false;
      return json(res, 200, step(story, null));
    }
    if (method === 'GET' && section === 'draft') {
      return json(res, 200, {
        storyId: story.id,
        status: story.status,
        tone: story.tone,
        toneRequired: story.toneRequired,
        situation: story.situation ? { category: story.situation.category, categoryLabel: story.situation.categoryLabel, timing: story.situation.timing, description: story.situation.description } : null,
        child: story.child,
        parent: story.message || story.situation ? { response: story.situation?.customReaction ?? null, concern: story.interview.summary ?? '아이가 불안해하는 것 같아요.', message: story.message, messageDirection: 'UNDECIDED' } : null,
        interview: { turns: story.interview.turns, summary: story.interview.summary, endReason: story.interview.endReason },
      });
    }
    if (method === 'POST' && section === 'interview' && sub === 'start') {
      if (story.status !== 'DRAFT') return conflict();
      if (!story.situation || !story.child) return error(res, 400, 'INCOMPLETE_STORY', '상황과 아이 정보를 먼저 입력해 주세요.');
      story.status = 'INTERVIEWING';
      story.interview.noQuestions = Boolean(story.situation.description?.includes('바로정리'));
      if (!story.interview.noQuestions) story.interview.turns.push({ turnNo: 1, question: INTERVIEW_QUESTIONS[0] });
      story.updatedAt = now();
      return json(res, 200, interviewResponse(story));
    }
    if (method === 'POST' && section === 'interview' && sub === 'answer') {
      if (story.status !== 'INTERVIEWING') return conflict();
      const answered = story.interview.turns.filter((turn) => turn.answer !== undefined).length;
      const turn = story.interview.turns[answered];
      if (!body.skip) {
        if (!body.answer?.trim() || body.answer.length > 500) return invalid(res, [['answer', '답변은 1~500자로 입력해 주세요.']]);
        const safety = safetyCheck(body.answer);
        if (safety.action === 'BLOCK') {
          story.status = 'BLOCKED';
          return json(res, 200, { ...interviewResponse(story, { safety }), type: 'QUESTION', question: null });
        }
        if (safety.action === 'ASK_REVISE') return json(res, 200, interviewResponse(story, { safety }));
      }
      turn.answer = body.skip ? '' : body.answer.trim();
      const done = story.interview.turns.filter((candidate) => candidate.answer !== undefined).length;
      if (done < INTERVIEW_QUESTIONS.length) story.interview.turns.push({ turnNo: done + 1, question: INTERVIEW_QUESTIONS[done] });
      story.updatedAt = now();
      return json(res, 200, interviewResponse(story));
    }
    if (method === 'POST' && section === 'confirm') {
      if (story.status !== 'CONFIRMING') return conflict();
      if (story.toneRequired && !story.tone) return error(res, 400, 'TONE_REQUIRED', '이야기 분위기를 골라 주세요.');
      if (story.situation?.description?.includes('유사테스트') && !story.similarOnce) {
        story.similarOnce = true;
        return error(res, 409, 'DUPLICATE_STORY', '이전 동화와 입력 내용이 거의 같아요.');
      }
      if (story.situation?.description?.includes('검토차단')) {
        story.status = 'BLOCKED';
        return error(res, 409, 'STORY_BLOCKED', '이 내용으로는 동화를 만들 수 없어요.');
      }
      startGeneration(story);
      return json(res, 202, generationResponse(story));
    }
    if (method === 'GET' && section === 'generation') return json(res, 200, generationResponse(story));
    if (method === 'POST' && section === 'retry') {
      if (story.status !== 'FAILED') return conflict();
      startGeneration(story, { scope: story.gen?.scope ?? 'ALL', failAt: -1 });
      story.gen.failAt = null;
      return json(res, 202, generationResponse(story));
    }
    if (method === 'GET' && section === 'preview') {
      if (!['REVIEWING', 'COMPLETED'].includes(story.status)) return conflict();
      const version = currentVersion(story);
      return json(res, 200, {
        storyId: story.id,
        status: story.status,
        version: { id: version.id, versionNo: version.versionNo, title: version.title },
        characterSheetUrl: `/api/stories/${story.id}/versions/${version.id}/character-sheet`,
        pages: pageView(story, version),
        regenerateRemaining: Math.max(0, 1 - story.regenerateUsed),
      });
    }
    if (method === 'POST' && section === 'regenerate') {
      if (story.status !== 'REVIEWING') return conflict();
      if (!['CHARACTER_STORY', 'TEXT', 'IMAGES'].includes(body.scope)) return invalid(res, [['scope', '다시 만들 부분을 골라 주세요.']]);
      if (story.regenerateUsed >= 1) return error(res, 409, 'REGENERATE_LIMIT', '다시 만들기는 1회만 가능해요.');
      const safety = safetyCheck(body.feedback);
      if (safety.action === 'ASK_REVISE') return json(res, 202, step(story, safety, false));
      if (safety.action === 'BLOCK') { story.status = 'BLOCKED'; return json(res, 202, step(story, safety, false)); }
      story.regenerateUsed += 1;
      startGeneration(story, { scope: body.scope, parentVersionNo: currentVersion(story).versionNo });
      return json(res, 202, step(story, safety));
    }
    if (method === 'GET' && section === 'versions') {
      return json(res, 200, story.versions.map((version) => ({
        id: version.id, versionNo: version.versionNo, parentVersionNo: version.parentVersionNo,
        title: version.title, scope: version.scope, createdAt: version.createdAt, current: version.id === story.currentVersionId,
      })));
    }
    if (method === 'PUT' && section === 'current-version') {
      if (story.status !== 'REVIEWING') return conflict();
      const version = story.versions.find((candidate) => candidate.id === Number(body.versionId));
      if (!version) return error(res, 404, 'VERSION_NOT_FOUND', '버전을 찾을 수 없어요.');
      story.currentVersionId = version.id;
      return json(res, 200, {
        storyId: story.id, status: story.status,
        version: { id: version.id, versionNo: version.versionNo, title: version.title },
        characterSheetUrl: `/api/stories/${story.id}/versions/${version.id}/character-sheet`,
        pages: pageView(story, version), regenerateRemaining: Math.max(0, 1 - story.regenerateUsed),
      });
    }
    if (method === 'POST' && section === 'approve') {
      if (story.status !== 'REVIEWING') return conflict();
      story.status = 'COMPLETED';
      story.confirmedAt = now();
      story.updatedAt = now();
      return json(res, 200, { storyId: story.id, status: story.status, confirmedAt: story.confirmedAt });
    }
    if (method === 'GET' && section === 'guide') {
      if (!['REVIEWING', 'COMPLETED'].includes(story.status)) return conflict('동화가 만들어진 뒤에 대화 가이드를 볼 수 있어요.');
      return json(res, 200, guide(story));
    }
    if (method === 'GET' && section === 'book') {
      if (story.status !== 'COMPLETED') return conflict('확정한 동화만 읽을 수 있어요.');
      const version = currentVersion(story);
      return json(res, 200, {
        storyId: story.id, versionId: version.id, title: version.title,
        coverUrl: coverUrl(story, version), pageCount: version.pages.length,
        pages: pageView(story, version), prompts: guide(story).prompts,
      });
    }
    if (section === 'reading-sessions') {
      if (story.status !== 'COMPLETED') return conflict('확정한 동화만 읽을 수 있어요.');
      if (method === 'POST' && !sub) {
        const session = { sessionId: id(), storyId: story.id, lastPage: 0, startedAt: now(), done: false, dialogue: {} };
        user.readingSessions.set(session.sessionId, session);
        return json(res, 201, { sessionId: session.sessionId, lastPage: 0, startedAt: session.startedAt });
      }
      if (method === 'GET' && sub === 'resume') {
        const open = [...user.readingSessions.values()].filter((session) => session.storyId === story.id && !session.done).at(-1);
        return open ? json(res, 200, { sessionId: open.sessionId, lastPage: open.lastPage, startedAt: open.startedAt }) : empty(res, 204);
      }
    }

    return error(res, 404, 'NOT_FOUND', '없는 주소예요.');
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`[mock-api] http://localhost:${port}  (인증번호 000000${seed ? ', 첫 로그인에 샘플 동화 5개 생성' : ''})`);
      resolve(server);
    });
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startMockApi({ seed: process.argv.includes('--seed') });
}
