// 아이와 읽기에서 쪽마다 들려주는 동화 낭독(TTS)이에요. 음성 파일은 백엔드가 만들어 쪽마다 audioUrl로 줘요.
// 미리보기(확정 전)에서는 쓰지 않아요.

// 백엔드가 쪽마다 주는 낭독 음성 주소예요. 필드 이름이 바뀌면 여기만 고치면 돼요. 없으면 그 쪽은 조용히 넘어가요.
export const narrationUrlOf = (storyPage) => storyPage?.audioUrl || null;

// 낭독을 켜고 끄는 설정은 이 기기에 기억해요. (처음에는 켜져 있어요)
const STORAGE_KEY = 'firstory.narrationEnabled';

export function isNarrationEnabled() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function saveNarrationEnabled(enabled) {
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    // 저장하지 못해도 이번 화면에서는 고른 대로 동작해요.
  }
}

// 아주 짧은 무음이에요. (8kHz·8bit WAV 10ms)
const SILENCE = 'data:audio/wav;base64,UklGRnQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==';

// 쪽이 바뀌어도 같은 오디오 하나로 재생해요. 아이패드·아이폰은 사람이 누른 순간에 한 번 재생한 오디오만 나중에 저절로 재생할 수 있어서예요.
let player = null;
let unlocked = false;

function playerOf() {
  if (!player && typeof Audio !== 'undefined') {
    player = new Audio();
    player.preload = 'auto';
  }
  return player;
}

// '아이와 읽기 시작하기'처럼 사람이 누른 순간에 불러요. 무음을 한 번 재생해, 책장이 넘어간 뒤 저절로 읽어 줄 수 있게 열어 둬요.
export function unlockNarration() {
  const audio = playerOf();
  if (!audio || unlocked) return;
  unlocked = true;
  audio.src = SILENCE;
  audio.play().catch(() => {
    unlocked = false;
  });
}

// 처음부터 읽어요. 읽던 중이면 멈추고 다시 읽어요.
export function playNarration(url) {
  const audio = playerOf();
  if (!audio || !url) return;
  audio.pause();
  if (audio.getAttribute('src') !== url) audio.src = url;
  audio.currentTime = 0;
  // 브라우저가 막으면(사람이 누른 적이 없으면) 조용히 넘어가요. 글을 누르면 다시 들을 수 있어요.
  audio.play().catch(() => {});
}

// 낭독이 나오는 중인지예요. (불러오는 중도 포함해요. 소리를 열어 두려고 튼 무음은 빼요)
export function isNarrationPlaying() {
  const audio = player;
  return Boolean(audio && !audio.paused && !audio.ended && audio.getAttribute('src') !== SILENCE);
}

export function stopNarration() {
  const audio = player;
  if (!audio) return;
  audio.pause();
  if (audio.getAttribute('src') === SILENCE) return;
  audio.currentTime = 0;
}
