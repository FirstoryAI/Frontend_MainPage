import { useCallback, useEffect, useRef } from 'react';

// 카드가 회전초밥처럼 오른쪽에서 왼쪽으로 천천히 흘러가요. 카드 한 벌을 SET_COUNT번 이어 붙여 두고,
// 한 벌만큼 움직이면 처음 자리로 돌아와서 끊김 없이 계속돼요.
// 첫 벌은 왼쪽으로 지나간 카드가 보이는 자리(왼쪽 막대 옆까지 보여요)를 채우는 앞쪽 벌이고, 읽는 벌은 PRIMARY_COPY번째예요.
// 화면 너비가 카드 한 벌 길이의 (SET_COUNT - 1)배보다 좁으면 어느 위치에서도 오른쪽 끝이 비지 않아요.
//
// 흐르는 움직임은 브라우저 애니메이션(Web Animations)에 맡겨요. 화면을 띄워 두는 내내 도는 움직임이라,
// 매 프레임 JS로 자리를 바꾸면 홈 화면이 가만히 있어도 계속 일했어요. 이제 GPU가 옮기고, JS는 멈추거나 끌 때만 일해요.
export const SET_COUNT = 3;
export const PRIMARY_COPY = 1;
const SPEED = 40; // 초당 움직이는 거리(px)
const DRAG_THRESHOLD = 4;

// viewportRef: 카드가 보이는 틀, trackRef: 카드를 담은 줄(여기에 움직임을 걸어요), setSize: 카드 한 벌의 카드 수
// paused: 모달이 열려 있는 것처럼 화면에서 멈춰야 할 때 true
// 마우스를 올려 두었거나 키보드로 카드에 포커스가 있거나 끌고 있을 때도 멈춰요. 움직임 줄이기를 켠 사람에게는 저절로 움직이지 않아요.
export function useConveyor({ setSize, paused = false, onCardClick }) {
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  // 한 벌의 길이(px)예요. 소수점까지 재서 한 바퀴 돌아올 때 어긋나지 않게 해요.
  const loop = useRef(0);
  const animation = useRef(null);
  const dragging = useRef(false);
  const hovered = useRef(false);
  const focused = useRef(false);
  const externalPause = useRef(paused);
  const drag = useRef({ pointerId: null, startX: 0, startOffset: 0, moved: false, pressedId: null });

  // 지금 흘러간 거리(0 ~ 한 벌 길이)예요.
  const getOffset = useCallback(() => {
    const current = animation.current;
    if (!current || loop.current <= 0) return 0;
    const duration = current.effect.getTiming().duration;
    return ((Number(current.currentTime) || 0) % duration) / duration * loop.current;
  }, []);

  // 흘러간 거리를 바로 그 자리로 옮겨요. (끌기·트랙패드·키보드 포커스)
  const setOffset = useCallback((value) => {
    const current = animation.current;
    if (!current || loop.current <= 0) return;
    const wrapped = ((value % loop.current) + loop.current) % loop.current;
    current.currentTime = (wrapped / loop.current) * current.effect.getTiming().duration;
  }, []);

  // 멈춰야 하는지 보고, 움직임을 멈추거나 다시 흘려요.
  const sync = useCallback(() => {
    const current = animation.current;
    if (!current) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hold = reduced || dragging.current || externalPause.current || hovered.current || focused.current;
    if (hold && current.playState === 'running') current.pause();
    if (!hold && current.playState !== 'running') current.play();
  }, []);

  useEffect(() => {
    externalPause.current = paused;
    // 팝업이 위를 덮은 채 커서가 떠나면 pointerleave를 놓칠 수 있어서, 팝업이 닫힐 때 실제 상태로 다시 확인해요.
    const viewport = viewportRef.current;
    if (!paused && viewport) {
      hovered.current = window.matchMedia('(hover: hover)').matches && viewport.matches(':hover');
      focused.current = Boolean(viewport.querySelector(':focus-visible'));
    }
    sync();
  }, [paused, sync]);

  // 첫 벌의 첫 카드에서 둘째 벌의 첫 카드까지 거리를 재고, 그 길이만큼 끝없이 흐르는 움직임을 만들어요. 화면 크기가 바뀌면 다시 만들어요.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;

    const build = () => {
      const cards = track.children;
      if (cards.length <= setSize) return;
      const length = cards[setSize].getBoundingClientRect().left - cards[0].getBoundingClientRect().left;
      if (!(length > 0) || Math.abs(length - loop.current) < 0.5) return;
      // 길이가 바뀌어도 지금 흘러간 비율은 그대로 이어가요.
      const ratio = loop.current > 0 ? getOffset() / loop.current : 0;
      animation.current?.cancel();
      loop.current = length;
      // 앞쪽 벌(loop)만큼 미리 당겨 두어서, 처음 자리에서 읽는 벌의 첫 카드가 시작선에 와요.
      animation.current = track.animate(
        [{ transform: `translate3d(${-length}px, 0, 0)` }, { transform: `translate3d(${-2 * length}px, 0, 0)` }],
        { duration: (length / SPEED) * 1000, iterations: Infinity, easing: 'linear' },
      );
      setOffset(ratio * length);
      sync();
    };

    build();
    const observer = new ResizeObserver(build);
    observer.observe(track);
    return () => {
      observer.disconnect();
      animation.current?.cancel();
      animation.current = null;
      loop.current = 0;
    };
  }, [setSize, getOffset, setOffset, sync]);

  // 움직임 줄이기 설정을 바꾸면 바로 따라요.
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduced.addEventListener('change', sync);
    return () => reduced.removeEventListener('change', sync);
  }, [sync]);

  // 키보드로 화면 밖 카드에 포커스가 가면 브라우저가 틀을 스크롤해요. 그만큼을 우리 위치로 옮기고 스크롤은 되돌려요.
  const handleScroll = (event) => {
    const viewport = event.currentTarget;
    if (viewport.scrollLeft === 0) return;
    setOffset(getOffset() + viewport.scrollLeft);
    viewport.scrollLeft = 0;
  };

  // 마우스가 있는 기기에서만 '올려 두면 멈춤'을 써요. (터치는 탭한 자리가 계속 hover로 남아서 멈춰 버려요.)
  const handlePointerEnter = (event) => {
    if (event.pointerType !== 'mouse' || !window.matchMedia('(hover: hover)').matches) return;
    hovered.current = true;
    sync();
  };

  const handlePointerLeave = (event) => {
    if (event.pointerType !== 'mouse') return;
    hovered.current = false;
    sync();
  };

  // 키보드로 카드에 왔을 때만 멈춰요. (마우스로 누른 포커스는 멈추지 않아요)
  const handleFocus = (event) => {
    focused.current = event.target.matches?.(':focus-visible') ?? false;
    sync();
  };

  const handleBlur = (event) => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    focused.current = false;
    sync();
  };

  const handlePointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startOffset: getOffset(),
      moved: false,
      pressedId: event.target.closest('[data-scenario-id]')?.dataset.scenarioId ?? null,
    };
    dragging.current = true;
    sync();
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const state = drag.current;
    if (state.pointerId !== event.pointerId) return;

    const distance = event.clientX - state.startX;
    if (Math.abs(distance) > DRAG_THRESHOLD && !state.moved) {
      state.moved = true;
      // 끄는 동안 손바닥 모양 커서를 보여주려고 틀에 표시를 달아요.
      event.currentTarget.dataset.dragging = 'true';
    }
    if (state.moved) setOffset(state.startOffset - distance);
  };

  const handlePointerUp = (event) => {
    const state = drag.current;
    if (state.pointerId !== event.pointerId) return;

    state.pointerId = null;
    dragging.current = false;
    delete event.currentTarget.dataset.dragging;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    sync();
    // 끌고 난 직후의 click은 카드를 연 것으로 치지 않도록, 이벤트가 지나간 뒤에 끌었다는 표시를 지워요.
    window.setTimeout(() => {
      drag.current.moved = false;
    }, 0);
  };

  const handleClick = (event) => {
    const id = event.target.closest('[data-scenario-id]')?.dataset.scenarioId ?? drag.current.pressedId;
    drag.current.pressedId = null;
    if (!drag.current.moved && id) onCardClick(id);
  };

  // 가로로 밀어 넘기는 트랙패드도 카드를 움직여요.
  const handleWheel = (event) => {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    setOffset(getOffset() + event.deltaX);
  };

  const handlers = {
    onScroll: handleScroll,
    onPointerEnter: handlePointerEnter,
    onPointerLeave: handlePointerLeave,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerUp,
    onClick: handleClick,
    onWheel: handleWheel,
  };

  return { viewportRef, trackRef, handlers };
}
