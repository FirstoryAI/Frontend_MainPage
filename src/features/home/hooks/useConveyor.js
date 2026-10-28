import { useCallback, useEffect, useRef } from 'react';

// 카드가 회전초밥처럼 오른쪽에서 왼쪽으로 천천히 흘러가요. 카드 한 벌을 SET_COUNT번 이어 붙여 두고,
// 한 벌만큼 움직이면 처음 자리로 돌아와서 끊김 없이 계속돼요.
// 화면 너비가 카드 한 벌 길이의 (SET_COUNT - 1)배보다 좁으면 어느 위치에서도 오른쪽 끝이 비지 않아요.
export const SET_COUNT = 5;
const SPEED = 40; // 초당 움직이는 거리(px)
const DRAG_THRESHOLD = 4;

// viewportRef: 카드가 보이는 틀, trackRef: 카드를 담은 줄(여기에 translateX를 줘요), setSize: 카드 한 벌의 카드 수
// paused: 모달이 열려 있는 것처럼 화면에서 멈춰야 할 때 true
// 마우스를 올려 두었거나 키보드로 카드에 포커스가 있거나 끌고 있을 때도 멈춰요. 움직임 줄이기를 켠 사람에게는 저절로 움직이지 않아요.
export function useConveyor({ setSize, paused = false, onCardClick }) {
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const offset = useRef(0);
  // 한 벌의 길이(px)예요. 소수점까지 재서 한 바퀴 돌아올 때 어긋나지 않게 해요.
  const loop = useRef(0);
  const dragging = useRef(false);
  const externalPause = useRef(paused);
  const drag = useRef({ pointerId: null, startX: 0, startOffset: 0, moved: false, pressedId: null });

  useEffect(() => {
    externalPause.current = paused;
  }, [paused]);

  // 첫 벌의 첫 카드에서 둘째 벌의 첫 카드까지 거리를 재요. 화면 크기가 바뀌면 다시 재요.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;

    const measure = () => {
      const cards = track.children;
      if (cards.length <= setSize) return;
      loop.current = cards[setSize].getBoundingClientRect().left - cards[0].getBoundingClientRect().left;
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [setSize]);

  const render = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    if (loop.current > 0) offset.current = ((offset.current % loop.current) + loop.current) % loop.current;
    track.style.transform = `translate3d(${-offset.current}px, 0, 0)`;
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    // 마우스가 있는 기기에서만 '올려 두면 멈춤'을 써요. (터치는 탭한 자리가 계속 hover로 남아서 멈춰 버려요.)
    const canHover = window.matchMedia('(hover: hover)');
    let frame = 0;
    let last = 0;

    // 멈춤 여부는 매 프레임 화면의 실제 상태로 물어봐요. 팝업이 위를 덮은 채 커서가 떠나는 것처럼
    // 이벤트를 놓치기 쉬운 경우에도 멈춘 채로 남지 않아요.
    const isHeld = () => {
      const viewport = viewportRef.current;
      if (!viewport) return true;
      if (canHover.matches && viewport.matches(':hover')) return true;
      return Boolean(viewport.querySelector(':focus-visible'));
    };

    const tick = (now) => {
      const elapsed = last ? Math.min(now - last, 64) : 0;
      last = now;
      if (!reduced.matches && !dragging.current && !externalPause.current && !document.hidden && !isHeld()) {
        offset.current += (SPEED * elapsed) / 1000;
      }
      render();
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [render]);

  // 키보드로 화면 밖 카드에 포커스가 가면 브라우저가 틀을 스크롤해요. 그만큼을 우리 위치로 옮기고 스크롤은 되돌려요.
  const handleScroll = (event) => {
    const viewport = event.currentTarget;
    if (viewport.scrollLeft === 0) return;
    offset.current += viewport.scrollLeft;
    viewport.scrollLeft = 0;
    render();
  };

  const handlePointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startOffset: offset.current,
      moved: false,
      pressedId: event.target.closest('[data-scenario-id]')?.dataset.scenarioId ?? null,
    };
    dragging.current = true;
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
    if (state.moved) {
      offset.current = state.startOffset - distance;
      render();
    }
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
    offset.current += event.deltaX;
    render();
  };

  const handlers = {
    onScroll: handleScroll,
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerUp,
    onClick: handleClick,
    onWheel: handleWheel,
  };

  return { viewportRef, trackRef, handlers };
}
