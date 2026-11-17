// 새 버전이 배포되면 예전 화면 파일(assets/…js)이 사라져서, 화면을 옮길 때 파일을 못 불러오는 일이 생겨요.
// (없는 파일 주소도 index.html로 돌려주기 때문에 'Failed to fetch dynamically imported module' 같은 오류가 나요.)
// 이럴 땐 페이지를 한 번 새로 불러오면 새 버전으로 바뀌어서 해결돼요.

const RELOAD_KEY = 'firstory:chunk-reload-at';
// 새로 불러온 뒤에도 또 실패하면 끝없이 새로고침하지 않도록, 이 시간 안에는 한 번만 다시 불러와요.
const RELOAD_COOLDOWN_MS = 15_000;

const CHUNK_ERROR_PATTERN = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS|Loading (CSS )?chunk [\w-]+ failed|Failed to load module script/i;

export function isChunkLoadError(error) {
  if (!error) return false;
  const message = typeof error === 'string' ? error : `${error.name ?? ''} ${error.message ?? ''}`;
  return CHUNK_ERROR_PATTERN.test(message);
}

// 최근에 새로 불러온 적이 없으면 새로 불러오고 true를 돌려줘요. 이미 해 봤으면 false예요.
export function reloadOnceForNewVersion() {
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Date.now() - last < RELOAD_COOLDOWN_MS) return false;
    window.sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // 저장소를 못 쓰면(시크릿 모드 등) 끝없이 새로고침할 수 있어서 하지 않아요.
    return false;
  }
  window.location.reload();
  return true;
}

// 화면 파일 미리 불러오기가 실패했을 때(Vite가 알려 줘요)도 같은 방식으로 처리해요.
export function watchPreloadErrors() {
  window.addEventListener('vite:preloadError', (event) => {
    if (reloadOnceForNewVersion()) event.preventDefault();
  });
}
