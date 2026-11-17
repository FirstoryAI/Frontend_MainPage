import { useEffect, useLayoutEffect, useRef } from 'react';
// 이 파일은 표지를 펼치고 덮을 때만 따로 받아요. (StoryFlipBook의 lazy) 그래서 첫 화면 번들은 그대로예요.
import { animate, useMotionValue } from 'motion/react';
import CoverFace from './CoverFace';
import styles from './StoryReader.module.css';

// 표지를 넘기는 시간(초)이에요. 앞쪽(FOLD_SHARE까지)에 표지가 넘어가고, GROW_FROM부터 펼친 책이 화면 가득 커져요.
// 두 구간이 조금 겹쳐서, 표지가 내려앉으며 멈추지 않고 그대로 책이 커져요.
const CURL_SECONDS = 1.7;
const FOLD_SHARE = 0.66;
const GROW_FROM = 0.52;
// 접히는 선이 기우는 정도예요. 오른쪽 아래 모서리부터 들려서, 넘어가는 중간에 정사각형 한 변의 이만큼 기울어요.
const FOLD_TILT = 0.2;
// 정사각형 표지 아래로 보이는 책 두께예요. (CSS .coverBook의 --edge와 같아요)
const COVER_EDGE = 0.022;
// 마우스를 올려 표지가 살짝 열려 있던 채로 누르면, 그 기울기에서 시작해 움직임 앞쪽(PEEK_SETTLE까지)에 곧게 펴져요. (CSS .coverSwing과 같아요)
const PEEK_DEG = 38;
const PEEK_SETTLE = 0.1;

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2);

// 넓은 화면에서 표지를 펼치거나(앞표지 ↔ 1쪽) 덮을 때(마지막 쪽 ↔ 뒤표지)의 움직임이에요. 실제 책장을 넘기듯 넘겨요.
//  - 펼치기: 앞표지의 오른쪽 끝자락이 들려 접히는 선이 책등 쪽으로 움직여요. 접혀 넘어간 부분은 표지 안쪽 종이가 보이고,
//    표지가 걷힌 자리에는 1쪽이 드러나요. 표지가 다 넘어가면, 펼친 정사각형 책이 화면 가득 커져요.
//  - 덮기: 펼친 쪽이 정사각형 책 크기로 작아진 뒤, 오른쪽 쪽의 끝자락이 들려 왼쪽으로 넘어가며 뒤표지가 덮여요.
//  - 되돌아갈 때(1쪽 → 앞표지, 뒤표지 → 마지막 쪽)는 같은 움직임을 거꾸로 해요.
// open은 책이 펼쳐진 정도예요. 0이면 덮인 책(표지), 1이면 화면 가득 펼친 쪽이에요.
// 그리는 건 매 프레임 open 값으로 자리를 계산해 바로 적용해요. (접히는 선, 넘어간 종이, 그림자, 책의 보이는 영역)
// insideSrc: 첫 쪽 그림이에요. 표지가 넘어가 내려앉는 안쪽 면에, 이 그림의 왼쪽 절반을 미리 깔아 빈 종이(여백)가 보이지 않게 해요.
export default function CoverMotion({ kind, reverse, src, insideSrc, pageWidth, square, slideRef, onEnd }) {
  const front = kind === 'open';
  const open = useMotionValue(front === !reverse ? 0 : 1);
  const onEndRef = useRef(onEnd);
  useEffect(() => {
    onEndRef.current = onEnd;
  });

  const rootRef = useRef(null);
  const spineRef = useRef(null);
  const remainRef = useRef(null);
  const flipRef = useRef(null);
  const foldShadeRef = useRef(null);
  const castShadowRef = useRef(null);
  const castClipRef = useRef(null);

  useLayoutEffect(() => {
    const slide = slideRef.current;
    const root = rootRef.current;
    if (!slide || !root) return undefined;

    // 표지를 열러 누른 순간 마우스가 표지 위에 있어서 살짝 열려 있었는지예요.
    const peeked = front && !reverse && Boolean(document.querySelector('[data-peek]:hover'));
    const c = square;
    const edge = c * COVER_EDGE;
    const draw = (value) => {
      const width = root.offsetWidth;
      const height = root.offsetHeight;
      // 정사각형 책의 위아래 자리(표지는 세로 가운데, 아래로 두께만큼 올라가 있어요)
      const top = (height - c - edge) / 2;
      const fold = easeInOut(clamp01(value / FOLD_SHARE));
      const grow = easeInOut(clamp01((value - GROW_FROM) / (1 - GROW_FROM)));
      // 접히는 선(책등 기준 좌표, x는 책등에서 오른쪽, y는 화면 위에서 아래)이에요.
      // 가운데 자리는 펼치기면 표지 끝(c) → 책등(0), 덮기면 반대로 움직여요.
      // 오른쪽 아래 모서리부터 들리도록 아래쪽이 앞서 기울고, 다 넘어가며 다시 곧게 펴져요.
      const lift = Math.sin(Math.PI * fold);
      const x = front ? c * (1 - fold) : c * fold;
      const tilt = FOLD_TILT * c * lift;
      const xTop = x + tilt;
      const xBottom = x - tilt;
      const centerY = top + c / 2;
      const lineX = (y) => xTop + ((xBottom - xTop) * (y - top)) / c;
      const turning = fold > 0.0005 && fold < 0.9995;

      // 덮인 책은 화면 가운데에 있어야 해서, 넘어가는 동안 책을 반 정사각형만큼 옮겨요.
      const slideX = front ? -(c / 2) * (1 - fold) : (c / 2) * (1 - fold);
      spineRef.current.style.transform = `translateX(${slideX}px)`;
      slide.style.translate = `${slideX}px 0`;

      // 접힌 부분: 책등 왼쪽에 내려앉을 면(앞표지면 안쪽 종이, 뒤표지면 뒤표지 그림)을 그려 두고,
      // 책등에 비친 뒤 접히는 선에 다시 비친 자리(두 번 거울)로 옮겨요.
      const length = Math.hypot(xBottom - xTop, c);
      const dx = (xBottom - xTop) / length;
      const dy = c / length;
      const r11 = dx * dx - dy * dy;
      const r12 = 2 * dx * dy;
      const r22 = dy * dy - dx * dx;
      // 접히는 선 위 한 점(가운데)으로 거울 이동을 맞춰요.
      const e = x - (r11 * x + r12 * centerY);
      const f = centerY - (r12 * x + r22 * centerY);
      flipRef.current.style.transformOrigin = `${pageWidth}px 0px`;
      flipRef.current.style.transform = `matrix(${-r11}, ${-r12}, ${r12}, ${r22}, ${e}, ${f})`;
      // 넘어간 부분만 보여요. (내려앉을 자리 기준: 책등에서 접히는 선만큼보다 더 왼쪽)
      // 책 두께(종이 단면)는 다 넘어와 내려앉을수록 드러나요.
      const flipLeft = Math.max(0, pageWidth - c - edge * (1 - x / c));
      // 위아래는 정사각형(아래 두께 포함) 안으로 잘라서, 접히는 선 그늘이 책 밖으로 나가지 않아요.
      const flipEdge = (y) => Math.max(flipLeft, pageWidth - lineX(y));
      const flipTop = top;
      const flipBottom = top + c + edge;
      flipRef.current.style.clipPath = `polygon(${flipLeft}px ${flipTop}px, ${flipEdge(flipTop)}px ${flipTop}px, ${flipEdge(flipBottom)}px ${flipBottom}px, ${flipLeft}px ${flipBottom}px)`;
      // 앞표지는 아직 넘어가지 않은 부분만 남겨요. (오른쪽 두께까지)
      if (remainRef.current) {
        remainRef.current.style.transform = peeked
          ? `perspective(3200px) rotateY(${-PEEK_DEG * (1 - clamp01(value / PEEK_SETTLE))}deg)` : '';
        const keep = (y) => Math.min(pageWidth, Math.max(0, lineX(y) + edge * (x / c)));
        remainRef.current.style.clipPath = `polygon(0 0, ${keep(0)}px 0, ${keep(height)}px ${height}px, 0 ${height}px)`;
      }

      // 접히는 선이 기운 각도예요. (위가 오른쪽으로 갈수록 시계 방향)
      const angle = (Math.atan2(xTop - xBottom, c) * 180) / Math.PI;
      const reach = height * 2;
      // 접히는 선 근처 그늘: 넘어간 종이 쪽에 있어서, 내려앉을 자리 기준으로 접히는 선의 왼쪽에 그려요.
      const shadeWidth = c * 0.16 * lift + 1;
      Object.assign(foldShadeRef.current.style, {
        left: `${pageWidth - x - shadeWidth}px`, top: `${centerY - reach / 2}px`,
        width: `${shadeWidth}px`, height: `${reach}px`,
        transformOrigin: '100% 50%', transform: `rotate(${-angle}deg)`,
        opacity: turning ? String(0.9 * lift) : '0',
      });
      // 걷힌 쪽 바닥(쪽·벽)에 드리우는 그림자: 정사각형 책 안에서 접히는 선 오른쪽에 그려요.
      Object.assign(castClipRef.current.style, {
        top: `${top}px`, height: `${c}px`, width: `${c + edge}px`,
      });
      const castWidth = c * 0.22 * lift + 1;
      Object.assign(castShadowRef.current.style, {
        left: `${x}px`, top: `${c / 2 - reach / 2}px`, width: `${castWidth}px`, height: `${reach}px`,
        transformOrigin: '0 50%', transform: `rotate(${angle}deg)`,
        opacity: turning ? String(lift) : '0',
      });

      // 책(쪽)은 펼친 정사각형 책 폭(2c)에 맞게 줄어 있다가, 화면 가득 커져요. (쪽 그림이 그대로 커지는 거라 매끄러워요)
      // 줄어 있는 동안은 정사각형 책 높이만큼만 보이고, 커지면서 위아래도 함께 드러나요.
      const baseScale = (2 * c) / width;
      const scale = baseScale + (1 - baseScale) * grow;
      slide.style.transformOrigin = `50% ${centerY}px`;
      slide.style.scale = String(scale);
      // 보일 영역(화면 기준)을 책 안의 좌표로 바꿔 잘라요. (자르기는 크기를 바꾸기 전 좌표로 해요)
      const toLocalY = (screenY) => centerY + (screenY - centerY) / scale;
      const bandTop = Math.max(0, toLocalY(top * (1 - grow)));
      const bandBottom = Math.min(height, toLocalY(top + c + (height - top - c) * grow));
      const half = width / 2;
      if (front) {
        // 펼치기: 표지가 걷힌 오른쪽 쪽만 보여요. 왼쪽 쪽은 넘어온 종이가 다 덮은 뒤(커지기 시작할 때)부터 보여요.
        const left = grow > 0 ? 0 : half;
        slide.style.clipPath = `inset(${bandTop}px 0 ${height - bandBottom}px ${left}px)`;
      } else if (!turning && x >= c - 0.5) {
        slide.style.clipPath = `inset(${bandTop}px 0 ${height - bandBottom}px 0)`;
      } else {
        // 덮기: 왼쪽 쪽은 그대로, 오른쪽 쪽은 접히는 선 왼쪽(아직 넘어가지 않은 부분)만 보여요.
        const edgeAt = (y) => Math.min(width, Math.max(half, half + lineX(y) / scale));
        slide.style.clipPath = `polygon(0 ${bandTop}px, ${edgeAt(top)}px ${bandTop}px, ${edgeAt(top + c)}px ${bandBottom}px, 0 ${bandBottom}px)`;
      }
      // 앞표지 안쪽 종이는 다 넘어간 뒤 펼친 쪽으로 자연스럽게 바뀌어요.
      flipRef.current.style.opacity = front ? String(1 - grow) : '1';
      root.style.visibility = 'visible';
    };

    draw(open.get());
    const unsubscribe = open.on('change', draw);
    return () => {
      unsubscribe();
      slide.style.clipPath = '';
      slide.style.translate = '';
      slide.style.scale = '';
      slide.style.transformOrigin = '';
    };
  }, [open, slideRef, square, pageWidth, front, reverse]);

  useLayoutEffect(() => {
    // 앞으로(앞표지 → 1쪽, 뒤표지 → 마지막 쪽)면 펼치고, 거꾸로면 덮어요.
    const opening = front ? !reverse : reverse;
    open.set(opening ? 0 : 1);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cancelled = false;
    const controls = animate(open, opening ? 1 : 0, { duration: reduce ? 0 : CURL_SECONDS, ease: 'linear' });
    controls.then(() => {
      if (!cancelled) onEndRef.current();
    });
    return () => {
      cancelled = true;
      controls.stop();
    };
  }, [front, reverse, open]);

  return (
    <div className={styles.curl} ref={rootRef} style={{ '--page-w': `${pageWidth}px`, visibility: 'hidden' }} aria-hidden="true">
      {/* 책등(화면 가운데)을 기준으로 놓아요. */}
      <div className={styles.curlSpine} ref={spineRef}>
        {front && (
          <div className={styles.curlRemain} ref={remainRef}>
            <CoverFace src={src} label="" side="front" />
          </div>
        )}
        <div className={styles.curlCastClip} ref={castClipRef}>
          <div className={styles.curlCast} ref={castShadowRef} />
        </div>
        <div className={styles.curlFlip} ref={flipRef}>
          {front ? (
            <div className={styles.coverFrame} data-side="back">
              <div className={`${styles.coverBook} ${styles.coverInsidePaper}`}>
                {/* 첫 쪽 그림의 왼쪽 절반이에요. 표지가 넘어가 내려앉을 자리(왼쪽 쪽)에 있는 그림과 같아서, 종이가 사라질 때 여백 없이 이어져요. */}
                {insideSrc && <img className={styles.coverInsideImage} src={insideSrc} alt="" decoding="async" draggable="false" />}
              </div>
            </div>
          ) : <CoverFace src={src} label="" side="back" />}
          {/* 접히는 선 근처 그늘이에요. 넘어간 면과 함께 옮겨지고 잘려요. */}
          <div className={styles.curlFoldShade} ref={foldShadeRef} />
        </div>
      </div>
    </div>
  );
}
