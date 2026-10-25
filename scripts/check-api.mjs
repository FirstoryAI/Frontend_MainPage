// 서버 API가 프론트가 기대하는 대로 동작하는지 점검하는 스크립트예요.
//
//   $env:FIRSTORY_EMAIL = '내 계정 이메일'; $env:FIRSTORY_PASSWORD = '내 비밀번호'
//   npm run check-api                 읽기만 하는 점검 (내 정보·홈·서재·아이 프로필)
//   npm run check-api -- --errors     + 예외 상황 점검 (로그인 안 함·잘못된 값·없는 동화·상태 오류·위기 신호)
//   npm run check-api -- --flow       + 동화 한 편을 끝까지 만들어 보기 (AI 인터뷰·글·그림 확인, 몇 분 걸려요)
//   npm run check-api -- --keep       --flow로 만든 동화를 지우지 않고 남겨 둠
//
// - 주소는 API_BASE 환경 변수, 없으면 .env의 API_PROXY_TARGET을 써요.
// - 계정은 직접 만든 테스트 계정을 쓰세요. --errors, --flow는 임시 동화를 만들고 끝나면 지워요. (확정·탈퇴는 하지 않아요)
// - 비밀번호는 이 컴퓨터에서 서버로만 보내고 어디에도 저장하지 않아요.
import { readFileSync } from 'node:fs';

const args = new Set(process.argv.slice(2));
const RUN_ERRORS = args.has('--errors');
const RUN_FLOW = args.has('--flow');
const KEEP = args.has('--keep');

function envFileValue(name) {
  try {
    const line = readFileSync(new URL('../.env', import.meta.url), 'utf8')
      .split(/\r?\n/)
      .find((item) => item.startsWith(`${name}=`));
    return line?.slice(name.length + 1).trim();
  } catch {
    return undefined;
  }
}

const BASE = (process.env.API_BASE || envFileValue('API_PROXY_TARGET') || 'http://localhost:8787').replace(/\/$/, '');
const EMAIL = process.env.FIRSTORY_EMAIL;
const PASSWORD = process.env.FIRSTORY_PASSWORD;

const jar = {};
const results = [];

function setCookies(response) {
  for (const cookie of response.headers.getSetCookie?.() ?? []) {
    const [pair] = cookie.split(';');
    const [name, ...value] = pair.split('=');
    if (value.join('=') === '' || /max-age=0/i.test(cookie)) delete jar[name];
    else jar[name] = value.join('=');
  }
}

async function call(method, path, body, { auth = true, csrf = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const cookie = Object.entries(jar).map(([name, value]) => `${name}=${value}`).join('; ');
    if (cookie) headers.Cookie = cookie;
  }
  if (csrf && jar['XSRF-TOKEN'] && !['GET', 'HEAD'].includes(method)) headers['X-XSRF-TOKEN'] = jar['XSRF-TOKEN'];

  let response;
  try {
    response = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch (error) {
    return { status: 0, data: null, raw: String(error.cause?.code ?? error.message) };
  }
  setCookies(response);

  const raw = await response.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }
  return { status: response.status, data, raw, headers: response.headers };
}

const short = (value, length = 90) => String(value ?? '').replace(/\s+/g, ' ').slice(0, length);

// 기대한 결과인지 기록해요. expected는 상태 코드(숫자 또는 숫자 목록)예요.
function check(label, response, expected, extra) {
  const wanted = [].concat(expected);
  const ok = wanted.includes(response.status);
  const detail = ok ? extra?.(response) : `기대 ${wanted.join('/')} → 실제 ${response.status} ${short(response.data?.message ?? response.raw)}`;
  results.push({ label, ok });
  console.log(`  ${ok ? '[OK]  ' : '[실패]'} ${label}${detail ? ` — ${detail}` : ''}`);
  return ok;
}

const section = (title) => console.log(`\n■ ${title}`);

async function login() {
  section('로그인');
  if (!EMAIL || !PASSWORD) {
    console.log('  FIRSTORY_EMAIL, FIRSTORY_PASSWORD 환경 변수가 필요해요. (맨 위 설명 참고)');
    process.exit(1);
  }
  await call('GET', '/api/auth/csrf');
  const response = await call('POST', '/api/auth/login', { email: EMAIL, password: PASSWORD });
  if (!check(`POST /api/auth/login (${BASE})`, response, 200, (r) => `onboardingSeen=${r.data?.onboardingSeen}`)) {
    process.exit(1);
  }
}

async function readChecks() {
  section('읽기 점검');
  check('GET /api/health', await call('GET', '/api/health', undefined, { auth: false }), 200);
  check('GET /api/me', await call('GET', '/api/me'), 200, (r) => `phoneMasked=${r.data?.phoneMasked}, smsNotify=${r.data?.smsNotify}`);
  check('GET /api/home', await call('GET', '/api/home'), 200, (r) => `개수=${JSON.stringify(r.data?.counts)}`);
  for (const filter of ['ALL', 'CREATING', 'REVIEWING', 'UNREAD', 'READ', 'FAILED']) {
    check(`GET /api/stories?filter=${filter}`, await call('GET', `/api/stories?filter=${filter}&page=0&size=20`), 200, (r) => `${r.data?.totalElements}개`);
  }
  check('GET /api/children', await call('GET', '/api/children'), 200, (r) => `${r.data?.length}명`);
  check('GET /api/children/options', await call('GET', '/api/children/options'), 200, (r) => `성향 ${r.data?.traits?.length}개, 좋아하는 것 ${r.data?.interests?.length}개`);

  const stories = (await call('GET', '/api/stories?filter=ALL&page=0&size=50')).data?.items ?? [];
  console.log(`  내 동화 ${stories.length}개의 그림·표지 상태`);
  for (const story of stories.slice(0, 10)) {
    const cover = story.coverUrl ? (await call('GET', story.coverUrl)).status : '표지 없음';
    console.log(`    - #${story.id} ${story.status} "${short(story.title, 20)}" 표지: ${cover}`);
  }
}

const SAFETY_PROBES = [
  { name: '분위기 선택이 필요한 주제', text: '친한 친구와 이별했어요' },
  { name: '표현을 바꿔야 하는 글', text: '아이를 때렸어요' },
  { name: '차단되는 글', text: '자해' },
];

async function newStory(label) {
  const created = await call('POST', '/api/stories');
  check(`${label}: POST /api/stories`, created, 201);
  return created.data?.storyId;
}

async function errorChecks() {
  section('예외 상황 점검');

  console.log(' (로그인·권한)');
  check('로그인 없이 GET /api/stories → 401', await call('GET', '/api/stories', undefined, { auth: false }), 401);
  check('CSRF 토큰 없이 POST /api/stories → 403', await call('POST', '/api/stories', undefined, { csrf: false }), [401, 403]);

  console.log(' (없는 값·잘못된 값)');
  check('없는 동화 GET /api/stories/999999999 → 404', await call('GET', '/api/stories/999999999'), 404);
  check('없는 동화 그림 → 404', await call('GET', '/api/stories/999999999/versions/1/pages/1/image'), 404);
  check('잘못된 filter → 400', await call('GET', '/api/stories?filter=ZZZ'), 400);

  const id = await newStory('예외 점검');
  if (!id) return;

  check('상황 형식 오류(category 없음) → 400', await call('PUT', `/api/stories/${id}/situation`, { timing: 'PAST', description: 'x' }), 400);
  check('아이 정보 형식 오류(birthYm) → 400', await call('PUT', `/api/stories/${id}/child`, { profile: { birthYm: 'abc', gender: 'FEMALE' }, saveForNextTime: false }), 400);
  check('정보 없이 인터뷰 시작 → 4xx', await call('POST', `/api/stories/${id}/interview/start`), [400, 409]);
  check('DRAFT에서 동화 만들기 시작 → 409', await call('POST', `/api/stories/${id}/confirm`), [400, 409]);
  check('아직 안 끝난 동화 미리보기 → 409', await call('GET', `/api/stories/${id}/preview`), 409);
  check('확정 전 대화 가이드 → 409', await call('GET', `/api/stories/${id}/guide`), 409);
  check('확정 전 읽기 시작 → 409', await call('POST', `/api/stories/${id}/reading-sessions`), [403, 404, 409]);

  console.log(' (위기 신호 — 서버가 어떤 글을 어떻게 판단하는지 보여줘요)');
  for (const probe of SAFETY_PROBES) {
    const probeId = await newStory(`위기 신호 점검 "${probe.name}"`);
    if (!probeId) continue;
    const response = await call('PUT', `/api/stories/${probeId}/situation`, {
      timing: 'PAST', category: 'OTHER', description: probe.text, reactions: [], emotions: [],
    });
    check(`"${probe.text}" → 상황 저장`, response, 200, (r) => `safety.action=${r.data?.safety?.action}, saved=${r.data?.saved}, status=${r.data?.status}`);
    await call('DELETE', `/api/stories/${probeId}`);
  }

  console.log(' (인터뷰 시작 뒤 수정)');
  const editId = await newStory('수정 점검');
  if (editId) {
    await call('PUT', `/api/stories/${editId}/situation`, { timing: 'PAST', category: 'FRIEND_CONFLICT', description: '친구와 다퉜어요', reactions: [], emotions: [] });
    await call('PUT', `/api/stories/${editId}/child`, { profile: { birthYm: '2021-05', gender: 'FEMALE' }, saveForNextTime: false });
    await call('PUT', `/api/stories/${editId}/message`, { message: '' });
    const start = await call('POST', `/api/stories/${editId}/interview/start`);
    check('인터뷰 시작', start, 200, (r) => `status=${r.data?.status}, type=${r.data?.type}, 첫 질문="${short(r.data?.question)}"`);
    check('인터뷰 시작 뒤 상황 수정 → 409(지금 명세)', await call('PUT', `/api/stories/${editId}/situation`, { timing: 'PAST', category: 'OTHER', description: '수정', reactions: [], emotions: [] }), [200, 409]);
    await call('DELETE', `/api/stories/${editId}`);
  }

  await call('DELETE', `/api/stories/${id}`);
  console.log('  (점검용 동화는 지웠어요)');
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function flowCheck() {
  section('동화 만들기 전체 흐름 (AI 인터뷰·글·그림)');
  const inputs = { event: '친구가 공룡 블록을 빼앗아서 속상했어요', trait: 'SHY', like: '공룡' };

  const id = await newStory('흐름 점검');
  if (!id) return;

  check('상황 저장', await call('PUT', `/api/stories/${id}/situation`, { timing: 'PAST', category: 'FRIEND_CONFLICT', description: inputs.event, reactions: [], emotions: [] }), 200);
  check('아이 정보 저장', await call('PUT', `/api/stories/${id}/child`, { profile: { birthYm: '2021-05', gender: 'FEMALE', traits: [inputs.trait], interestCodes: ['DINOSAUR'], customInterests: [] }, saveForNextTime: false }), 200);
  check('전하고 싶은 말 저장(비움)', await call('PUT', `/api/stories/${id}/message`, { message: '' }), 200);

  let response = await call('POST', `/api/stories/${id}/interview/start`);
  check('인터뷰 시작(AI)', response, 200, (r) => `type=${r.data?.type}`);
  const questions = [];
  let turns = 0;
  while (response.status === 200 && response.data?.type === 'QUESTION' && turns < 8) {
    questions.push(response.data.question);
    console.log(`    AI 질문 ${turns + 1}: ${short(response.data.question, 120)}`);
    response = await call('POST', `/api/stories/${id}/interview/answer`, { answer: '블록을 빼앗겨서 많이 속상해했어요.' });
    check(`답변 ${turns + 1} 전송`, response, 200, (r) => `type=${r.data?.type}`);
    turns += 1;
  }
  const summary = response.data?.summary ?? '';
  console.log(`    질문 ${questions.length}번 뒤 마무리(${response.data?.type}). 요약: ${short(summary, 140)}`);
  const reflected = ['공룡', '블록', '친구'].filter((word) => (questions.join(' ') + summary).includes(word));
  console.log(`    입력 반영 여부: 질문·요약에 ${reflected.length ? reflected.join(', ') : '입력했던 단어가 없음'}`);
  results.push({ label: '인터뷰가 입력을 반영', ok: reflected.length > 0 });

  if (!check('동화 만들기 시작', await call('POST', `/api/stories/${id}/confirm`), 202)) return;

  const startedAt = Date.now();
  let status = '';
  while (Date.now() - startedAt < 6 * 60 * 1000) {
    const generation = (await call('GET', `/api/stories/${id}/generation`)).data;
    if (generation?.status !== status) {
      status = generation?.status;
      console.log(`    ${Math.round((Date.now() - startedAt) / 1000)}초: ${status} (단계 ${generation?.stage} ${generation?.stageLabel ?? ''})`);
    }
    if (['REVIEWING', 'FAILED', 'BLOCKED'].includes(status)) break;
    await sleep(3000);
  }
  results.push({ label: '동화 만들기가 REVIEWING까지 도착', ok: status === 'REVIEWING' });
  console.log(`  ${status === 'REVIEWING' ? '[OK]  ' : '[실패]'} 동화 만들기 결과: ${status || '시간 초과'}`);

  if (status === 'REVIEWING') {
    const preview = await call('GET', `/api/stories/${id}/preview`);
    check('미리보기', preview, 200, (r) => `${r.data?.pages?.length}쪽, 다시 만들기 남은 횟수=${r.data?.regenerateRemaining}`);
    for (const page of preview.data?.pages ?? []) {
      const image = page.imageUrl ? await call('GET', page.imageUrl) : null;
      const label = `${page.pageNo}쪽 그림 (${page.imageStatus})`;
      const type = image?.headers?.get('content-type') ?? '';
      const ok = Boolean(image && image.status === 200 && type.startsWith('image/'));
      results.push({ label, ok });
      console.log(`  ${ok ? '[OK]  ' : '[실패]'} ${label} — ${image ? `${image.status} ${type}` : '그림 주소 없음'} / 글: ${short(page.text, 30)}`);
    }
    const list = (await call('GET', '/api/stories?filter=REVIEWING&size=50')).data?.items ?? [];
    const card = list.find((item) => item.id === id);
    results.push({ label: '서재 표지(coverUrl)', ok: Boolean(card?.coverUrl) });
    console.log(`  ${card?.coverUrl ? '[OK]  ' : '[실패]'} 서재 표지 주소: ${card?.coverUrl ?? '없음'}`);
  }

  if (!KEEP) {
    check('점검용 동화 삭제', await call('DELETE', `/api/stories/${id}`), [204, 409]);
  } else {
    console.log(`  점검용 동화 #${id}를 남겨 뒀어요.`);
  }
}

console.log(`서버: ${BASE}`);
await login();
await readChecks();
if (RUN_ERRORS) await errorChecks();
if (RUN_FLOW) await flowCheck();

const failed = results.filter((item) => !item.ok);
section('요약');
console.log(`  전체 ${results.length}개 중 통과 ${results.length - failed.length}개, 확인 필요 ${failed.length}개`);
failed.forEach((item) => console.log(`    - ${item.label}`));
if (!RUN_ERRORS) console.log('\n  예외 상황은 --errors, 동화 한 편을 끝까지 만드는 점검은 --flow를 붙여 실행해 보세요.');
process.exit(failed.length ? 2 : 0);
