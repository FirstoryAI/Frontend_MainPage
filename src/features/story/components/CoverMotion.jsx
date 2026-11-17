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
// 정사각형 표지 아래로 보이는 책 두께예요. (CSS .coverBook의 --edge와 같아요)
const COVER_EDGE = 0.022;

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2);

// 넓은 화면에서 표지를 펼치거나(앞표지 ↔ 1쪽) 덮을 때(마지막 쪽 ↔ 뒤표지)의 움직임이에요. 실제 책장을 넘기듯 넘겨요.
//  - 펼치기: 앞표지의 오른쪽 끝자락이 들려 접히는 선이 책등 쪽으로 움직여요. 접혀 넘어간 부분은 표지 안쪽 종이가 보이고,
//    표지가 걷힌 자리에는 1쪽이 드러나요. 표지가 다 넘어가면, 펼친 정사각형 책이 화면 가득 커져요.
//  - 덮기: 펼친 쪽이 정사각형 책 크기로 작아진 뒤, 오른쪽 쪽의 끝자락이 들려 왼쪽으로 넘어가며 뒤표지가 덮여요.
//  - 되돌아갈 때(1쪽 → 앞표지, 뒤표지 → 마지막 쪽)는 같은 움직임을 거꾸로 해요.
// open은 책이 펼쳐진 정도예요. 0이면 덮인 책(표지), 1이면 화면 가득 펼친 쪽이에요.
// 그리는 건 매 프레임 open 값으로 자리를 계산해 바로 적용해요. (접히는 선, 넘어간 종이, 그림자, 책의 보이는 영역)
export default function CoverMotion({ kind, reverse, src, pageWidth, square, slideRef, onEnd }) {
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

  useLayoutEffect(() => {
    const slide = slideRef.current;
    const root = rootRef.current;
    if (!slide || !root) return undefined;

    const c = square;
    const edge = c * COVER_EDGE;
    const draw = (value) => {
      const width = root.offsetWidth;
      const height = root.offsetHeight;
      // 정사각형 책의 위아래 자리(표지는 세로 가운데, 아래로 두께만큼 올라가 있어요)
      const top = (height - c - edge) / 2;
      const fold = easeInOut(clamp01(value / FOLD_SHARE));
      const grow = easeInOut(clamp01((value - GROW_FROM) / (1 - GROW_FROM)));
      // 접히는 선의 자리(책등에서 오른쪽으로). 펼치기는 표지 끝(c) → 책등(0), 덮기는 반대로 움직여요.
      const x = front ? c * (1 - fold) : c * fold;
      // 덮인 책은 화면 가운데에 있어야 해서, 넘어가는 동안 책을 반 정사각형만큼 옮겨요.
      const slideX = front ? -(c / 2) * (1 - fold) : (c / 2) * (1 - fold);
      spineRef.current.style.transform = `translateX(${slideX}px)`;
      slide.style.translate = `${slideX}px 0`;

      // 접힌 부분: 책등 왼쪽에 놓일 면(앞표지면 안쪽 종이, 뒤표지면 뒤표지 그림)을 접히는 선에 거울처럼 비춰 놓아요.
      // 정사각형 중 넘어간 부분만 보여요. 책 두께(종이 단면)는 다 넘어와 내려앉을수록 드러나요.
      flipRef.current.style.transform = `translateX(${2 * x}px)`;
      flipRef.current.style.clipPath = `inset(0 ${x}px 0 ${Math.max(0, pageWidth - c - edge * (1 - x / c))}px)`;
      // 앞표지는 아직 넘어가지 않은 부분만 남겨요. (오른쪽 두께까지)
      if (remainRef.current) {
        remainRef.current.style.clipPath = `inset(0 ${Math.max(0, pageWidth - x - edge * (x / c))}px 0 0)`;
      }

      // 접히는 선 근처 그늘(넘어간 종이 쪽)과 바닥에 드리우는 그림자(걷힌 쪽). 표지가 세워질 즈음 가장 짙어요.
      const lift = Math.sin(Math.PI * fold);
      const shadeWidth = c * 0.16 * lift + 1;
      Object.assign(foldShadeRef.current.style, {
        top: `${top}px`, height: `${c}px`, left: `${x - shadeWidth}px`, width: `${shadeWidth}px`,
        opacity: x > 0.5 && x < c - 0.5 ? String(0.9 * lift) : '0',
      });
      const castWidth = c * 0.22 * lift + 1;
      Object.assign(castShadowRef.current.style, {
        top: `${top}px`, height: `${c}px`, left: `${x}px`, width: `${Math.min(castWidth, c - x + edge)}px`,
        opacity: x > 0.5 && x < c - 0.5 ? String(lift) : '0',
      });

      // 책(쪽)은 펼친 정사각형 책 폭(2c)에 맞게 줄어 있다가, 화면 가득 커져요. (쪽 그림이 그대로 커지는 거라 매끄러워요)
      // 줄어 있는 동안은 정사각형 책 높이만큼만 보이고, 커지면서 위아래도 함께 드러나요.
      const baseScale = (2 * c) / width;
      const scale = baseScale + (1 - baseScale) * grow;
      const centerY = top + c / 2;
      slide.style.transformOrigin = `50% ${centerY}px`;
      slide.style.scale = String(scale);
      // 보일 영역(화면 기준)을 책 안의 좌표로 바꿔 잘라요. (자르기는 크기를 바꾸기 전 좌표로 해요)
      const toLocalY = (screenY) => centerY + (screenY - centerY) / scale;
      const bandTop = Math.max(0, toLocalY(top * (1 - grow)));
      const bandBottom = Math.min(height, toLocalY(top + c + (height - top - c) * grow));
      const half = width / 2;
      // 펼치기: 왼쪽 쪽은 넘어오는 종이가 덮은 만큼만 보여요. 덮기: 오른쪽 쪽은 아직 넘어가지 않은 부분만 보여요.
      const left = front ? Math.min(half, Math.max(0, half + (2 * x - c) / scale)) : 0;
      const right = front ? 0 : Math.min(half, Math.max(0, half - x / scale));
      slide.style.clipPath = `inset(${bandTop}px ${right}px ${height - bandBottom}px ${left}px)`;
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
  }, [open, slideRef, square, pageWidth, front]);

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
        <div className={styles.curlCast} ref={castShadowRef} />
        <div className={styles.curlFlip} ref={flipRef}>
          {front ? (
            <div className={styles.coverFrame} data-side="back">
              <div className={`${styles.coverBook} ${styles.coverInsidePaper}`} />
            </div>
          ) : <CoverFace src={src} label="" side="back" />}
        </div>
        <div className={styles.curlFoldShade} ref={foldShadeRef} />
      </div>
    </div>
  );
}
