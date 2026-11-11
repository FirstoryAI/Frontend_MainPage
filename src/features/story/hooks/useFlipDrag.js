import { useRef } from 'react';

// 이만큼 옆으로 움직여야 책장을 잡은 것으로 봐요. 그보다 적게 움직이고 떼면 그냥 누른 거예요.
const DRAG_START_PX = 8;
// 쪽 폭의 이만큼 넘게 끌고 놓으면 끝까지 넘어가요. 덜 끌면 제자리로 돌아가요.
const FINISH_RATIO = 0.25;
// 이보다 빠르게 쓸어 넘기면 조금만 끌어도 넘어가요. (px/ms)
const FLICK_SPEED = 0.45;
// 놓은 뒤 책장이 가운데 접는 선을 넘어가기까지 걸리는 시간이에요. 그 뒤는 라이브러리가 마저 넘겨요.
const FINISH_MS = 140;

const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });

// react-pageflip의 기본 마우스·터치 처리를 대신해요. (useMouseEvents={false}와 함께 써요)
//  - 마우스를 올리기만 해서는 아무 일도 없고, 누른 채 끌 때만 책장이 접혀요.
//  - 쪽 어디를 잡든(가운데 포함) 그 쪽의 가장자리를 잡은 것처럼 바꿔서, 손가락이 움직인 만큼 책장 끝이 따라와요.
//    위·아래 모서리가 손가락 자리로 튀어 오지 않고, 옆으로 끌면 책장이 곧게 넘어가요.
//  - 실제 책처럼 잡은 쪽의 책장만 넘어가요. 오른쪽 절반은 왼쪽으로 끌어 다음 쪽으로, 왼쪽 절반은 오른쪽으로 끌어 이전 쪽으로 가요.
//    반대 방향으로 끌거나, 넘어갈 쪽이 없으면(첫 장의 왼쪽, 마지막 장의 오른쪽) 아무 모션도 나오지 않아요.
// onTap: 끌지 않고 누르기만 했을 때 불러요. canPrev/canNext: 이전·다음 쪽이 있는지예요.
export function useFlipDrag(bookRef, { onTap, canPrev = true, canNext = true } = {}) {
  const drag = useRef(null);

  const bookOf = () => bookRef.current?.pageFlip?.();
  // 라이브러리는 책을 감싼 요소 기준 좌표를 써요.
  const pointOf = (book, event) => {
    const box = book.getUI().getDistElement().getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  };

  // 누른 곳이 오른쪽 절반이면 다음 쪽, 왼쪽 절반이면 이전 쪽으로 넘기는 거예요.
  // (한 쪽씩 보이는 화면은 보이는 쪽이 책의 오른쪽 절반이라, 그 쪽의 가운데를 기준으로 나눠요)
  const isForwardSide = (book, point) => {
    const rect = book.getBoundsRect();
    const x = point.x - rect.left;
    return book.getOrientation() === 'portrait' ? x >= rect.pageWidth * 1.5 : x >= rect.width / 2;
  };

  const begin = (book, d, forward) => {
    const rect = book.getBoundsRect();
    const portrait = book.getOrientation() === 'portrait';
    // 앞으로 넘길 땐 오른쪽 끝, 뒤로 넘길 땐 왼쪽 끝을 잡아요. (한 쪽씩 보이는 화면은 보이는 쪽이 책의 오른쪽 절반이에요)
    const edgeX = forward ? rect.width - 1 : (portrait ? rect.pageWidth + 1 : 1);
    // 위 절반을 잡으면 위 모서리, 아래 절반을 잡으면 아래 모서리를 기준으로 접혀요.
    const edgeY = d.start.y - rect.top < rect.height / 2 ? 1 : rect.height - 1;
    d.offset = { x: rect.left + edgeX - d.start.x, y: rect.top + edgeY - d.start.y };
    d.rect = rect;
    d.forward = forward;
    d.started = true;
    book.startUserTouch(add(d.start, d.offset));
  };

  const finish = (book, d) => {
    const spine = d.rect.left + d.rect.width / 2;
    const targetX = spine + (d.forward ? -1 : 1) * d.rect.pageWidth * 0.05;
    const from = d.current;
    const passed = d.forward ? from.x <= targetX : from.x >= targetX;
    if (passed) {
      book.userStop(from);
      return;
    }
    const startedAt = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - startedAt) / FINISH_MS);
      const eased = 1 - (1 - t) ** 2;
      const pos = { x: from.x + (targetX - from.x) * eased, y: from.y };
      book.userMove(pos, true);
      if (t < 1) requestAnimationFrame(step);
      else book.userStop(pos);
    };
    requestAnimationFrame(step);
  };

  const onPointerDown = (event) => {
    if (!event.isPrimary || event.button !== 0 || event.target.closest('button')) return;
    const book = bookOf();
    if (!book || book.getState() !== 'read') return;
    const start = pointOf(book, event);
    drag.current = { id: event.pointerId, start, current: start, samples: [{ x: start.x, t: event.timeStamp }], started: false };
  };

  const onPointerMove = (event) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    const book = bookOf();
    if (!book) return;

    const point = pointOf(book, event);
    const dx = point.x - d.start.x;
    const dy = point.y - d.start.y;
    d.samples = [...d.samples.slice(-5), { x: point.x, t: event.timeStamp }];

    if (!d.started) {
      // 세로로 먼저 움직이면 넘기기가 아니에요. (휴대폰에서 글을 올려 보는 경우)
      if (Math.abs(dy) > DRAG_START_PX * 2 && Math.abs(dy) > Math.abs(dx)) {
        drag.current = null;
        return;
      }
      if (Math.abs(dx) < DRAG_START_PX || Math.abs(dx) < Math.abs(dy)) return;
      const forward = isForwardSide(book, d.start);
      // 넘어갈 쪽이 없으면 이번 누름에서는 넘기지 않아요.
      if (forward ? !canNext : !canPrev) {
        drag.current = null;
        return;
      }
      // 잡은 쪽과 반대 방향으로 끄는 동안에는 기다려요.
      if (forward ? dx > 0 : dx < 0) return;
      begin(book, d, forward);
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }

    d.current = add(point, d.offset);
    book.userMove(d.current, true);
  };

  const onPointerEnd = (event) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    drag.current = null;

    if (!d.started) {
      if (event.type === 'pointerup') onTap?.(event);
      return;
    }
    const book = bookOf();
    if (!book) return;

    const sign = d.forward ? -1 : 1;
    const travelled = sign * (d.current.x - d.offset.x - d.start.x);
    const first = d.samples[0];
    const last = d.samples[d.samples.length - 1];
    const speed = last.t > first.t ? (sign * (last.x - first.x)) / (last.t - first.t) : 0;
    const done = event.type === 'pointerup'
      && (travelled > d.rect.pageWidth * FINISH_RATIO || speed > FLICK_SPEED);

    if (done) finish(book, d);
    else book.userStop(d.current);
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: onPointerEnd,
    onPointerCancel: onPointerEnd,
  };
}
