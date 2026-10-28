import { useCallback, useEffect, useRef } from 'react';

// 카드가 회전초밥처럼 오른쪽에서 왼쪽으로 천천히 흘러가요. 카드 한 벌을 SET_COUNT번 이어 붙여 두고,
// 한 벌만큼 움직이면 처음 자리로 돌아와서 끊김 없이 계속돼요.
export const SET_COUNT = 3;
const SPEED = 40; // 초당 움직이는 거리(px)
const DRAG_THRESHOLD = 4;

// viewportRef: 카드가 보이는 틀, trackRef: 카드를 담은 줄(여기에 translateX를 줘요), setSize: 카드 한 벌의 카드 수
// paused: 모달이 열려 있는 것처럼 화면에서 멈춰야 할 때 true
// 마우스를 올리거나 카드에 포커스가 있거나 끌고 있을 때도 멈춰요. 움직임 줄이기를 켠 사람에게는 저절로 움직이지 않아요.
export function useConveyor({ setSize, paused = false, onCardClick }) {
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const offset = useRef(0);
  const hold = useRef({ hover: false, focus: false, drag: false, external: paused });
  const drag = useRef({ pointerId: null, startX: 0, startOffset: 0, moved: false, pressedId: null });

  useEffect(() => {
    hold.current.external = paused;
  }, [paused]);

  const render = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    // 한 벌의 길이(첫 벌의 첫 카드에서 둘째 벌의 첫 카드까지)예요.
    const cards = track.children;
    const loop = cards.length > setSize ? cards[setSize].offsetLeft - cards[0].offsetLeft : 0;
    if (loop > 0) offset.current = ((offset.current % loop) + loop) % loop;
    track.style.transform = `translate3d(${-offset.current}px, 0, 0)`;
  }, [setSize]);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let last = 0;

    const tick = (now) => {
      const elapsed = last ? Math.min(now - last, 64) : 0;
      last = now;
      const { hover, focus, drag: dragging, external } = hold.current;
      if (!reduced.matches && !hover && !focus && !dragging && !external && !document.hidden) {
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
    hold.current.drag = true;
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
    hold.current.drag = false;
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
    onPointerEnter: (event) => {
      if (event.pointerType === 'mouse') hold.current.hover = true;
    },
    onPointerLeave: () => {
      hold.current.hover = false;
    },
    onFocus: () => {
      hold.current.focus = true;
    },
    onBlur: () => {
      hold.current.focus = false;
    },
  };

  return { viewportRef, trackRef, handlers };
}
