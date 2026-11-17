import { useEffect, useLayoutEffect, useRef } from 'react';
// 이 파일은 표지를 펼치고 덮을 때만 따로 받아요. (StoryFlipBook의 lazy) 그래서 첫 화면 번들은 그대로예요.
import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import CoverFace from './CoverFace';
import styles from './StoryReader.module.css';

// 표지를 펼치고 덮는 움직임이에요. (Motion 키프레임)
// 실제 표지처럼 처음엔 천천히 들리고, 세워진 뒤 빨라졌다가 부드럽게 내려앉아요.
// 내려앉을 때 목표를 아주 조금(1.2%) 지나쳤다가 돌아와서 종이가 툭 놓이는 느낌을 줘요.
const COVER_MOTION = { duration: 1.1, times: [0, 0.82, 1], ease: [[0.6, 0.02, 0.28, 1], 'easeInOut'] };
const COVER_OVERSHOOT = 0.012;

// 넓은 화면에서 표지를 펼치거나(앞표지 ↔ 1쪽) 덮을 때(마지막 쪽 ↔ 뒤표지)의 움직임이에요.
// 정사각형 표지와 화면 가득한 쪽은 모양이 달라서, 라이브러리 책장 넘김 대신 따로 움직여요.
// open은 책이 펼쳐진 정도예요. 0이면 덮인 책(표지), 1이면 펼친 쪽이에요. 책(slideRef, 쪽들)도 같은 값으로 나타나고 사라져요.
//  - 펼치기: 표지가 책등을 축으로 들려 왼쪽으로 넘어가요. 넘어가며 빛을 덜 받아 어두워지고, 안쪽 종이가 보였다가 사라져요.
//    들린 표지의 그림자가 책등 옆에 드리우고, 뒤에서 쪽이 살짝 커지며 나타나요.
//  - 덮기: 쪽이 살짝 작아지며 사라지고, 뒤표지가 오른쪽에서 넘어와 가운데에 내려앉아요.
//  - 되돌아갈 때(1쪽 → 앞표지, 뒤표지 → 마지막 쪽)는 같은 움직임을 거꾸로 해요.
export default function CoverMotion({ kind, reverse, src, pageWidth, shift, square, slideRef, onEnd }) {
  const front = kind === 'open';
  // 책이 펼쳐진 정도(0: 덮인 책, 1: 펼친 쪽)예요. 처음 값은 아래에서 방향에 맞춰 정해요.
  const open = useMotionValue(front === !reverse ? 0 : 1);
  const onEndRef = useRef(onEnd);
  useEffect(() => {
    onEndRef.current = onEnd;
  });

  // 앞표지는 책등(왼쪽)을 축으로 0° → -180°, 뒤표지는 책등(오른쪽)을 축으로 0° → 180°로 펼쳐져요.
  // 내려앉을 때 살짝 출렁이도록 각도·위치는 범위를 넘어도 그대로 따라가요.
  const rotateY = useTransform(open, (value) => value * (front ? -180 : 180));
  const x = useTransform(open, (value) => (front ? (value - 1) * shift : (1 - value) * shift));
  // 펼친 쪽에 닿을 즈음 표지는 사라져요. (쪽이 그 자리를 이어받아요)
  const leafOpacity = useTransform(open, [0.82, 1], [1, 0]);
  // 빛은 위에서 들어와요. 표지가 들리며 세워질수록 어두워지고, 안쪽 종이는 내려앉을수록 밝아져요.
  const faceShade = useTransform(open, [0, 0.5], [0, 0.5]);
  const insideShade = useTransform(open, [0.5, 1], [0.35, 0]);
  // 들린 표지가 책등 옆에 드리우는 그림자예요. 표지가 세워질수록 좁아져요.
  const nearShadowScale = useTransform(open, [0, 0.5], [1, 0]);
  const nearShadowOpacity = useTransform(open, [0, 0.12, 0.5], [0, 0.38, 0]);
  const farShadowScale = useTransform(open, [0.5, 1], [0, 1]);
  const farShadowOpacity = useTransform(open, [0.5, 0.86, 1], [0, 0.3, 0]);

  // 책(쪽들)은 펼쳐질수록 나타나고 살짝 커져요. 움직임이 끝나면 원래대로 돌려놔요.
  useLayoutEffect(() => {
    const slide = slideRef.current;
    if (!slide) return undefined;
    const apply = (value) => {
      slide.style.opacity = String(Math.min(1, Math.max(0, (value - 0.12) / 0.43)));
      slide.style.scale = String(0.93 + 0.07 * Math.min(1, Math.max(0, value)));
    };
    apply(open.get());
    const unsubscribe = open.on('change', apply);
    return () => {
      unsubscribe();
      slide.style.opacity = '';
      slide.style.scale = '';
    };
  }, [open, slideRef]);

  useLayoutEffect(() => {
    // 앞으로(앞표지 → 1쪽, 뒤표지 → 마지막 쪽)면 펼치고, 거꾸로면 덮어요.
    const opening = front ? !reverse : reverse;
    open.set(opening ? 0 : 1);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cancelled = false;
    const target = opening ? 1 : 0;
    const past = opening ? 1 + COVER_OVERSHOOT : -COVER_OVERSHOOT;
    const controls = reduce
      ? animate(open, target, { duration: 0 })
      : animate(open, [opening ? 0 : 1, past, target], COVER_MOTION);
    controls.then(() => {
      if (!cancelled) onEndRef.current();
    });
    return () => {
      cancelled = true;
      controls.stop();
    };
  }, [front, reverse, open]);

  // 표지가 처음 놓인 쪽(앞표지는 책등 오른쪽, 뒤표지는 왼쪽)과 넘어간 쪽에 그림자를 드리워요.
  const nearSide = front ? 'right' : 'left';
  const farSide = front ? 'left' : 'right';
  return (
    <div className={styles.coverMotion} data-kind={kind}
      style={{ '--page-w': `${pageWidth}px`, '--square': `${square}px` }} aria-hidden="true">
      <motion.div className={styles.coverCastShadow} data-side={nearSide}
        style={{ scaleX: nearShadowScale, opacity: nearShadowOpacity }} />
      <motion.div className={styles.coverCastShadow} data-side={farSide}
        style={{ scaleX: farShadowScale, opacity: farShadowOpacity }} />
      {/* 넘어가는 표지에 투명도를 주면 입체가 평평해져 뒷면 숨김이 안 돼서, 투명도와 원근은 바깥 틀에 줘요. */}
      <motion.div className={styles.coverLeafStage} style={{ opacity: leafOpacity }}>
      <motion.div className={styles.coverLeaf} style={{ x, rotateY }}>
        <div className={styles.coverLeafFace}>
          <CoverFace src={src} label="" side={front ? 'front' : 'back'} />
          <motion.span className={styles.coverLeafShade} style={{ opacity: faceShade }} />
        </div>
        {/* 표지 안쪽(종이)이에요. 넘어가는 동안 뒤집힌 면으로 보여요. */}
        <div className={`${styles.coverLeafFace} ${styles.coverLeafInside}`}>
          <div className={styles.coverFrame} data-side={front ? 'back' : 'front'}>
            <div className={`${styles.coverBook} ${styles.coverInsidePaper}`} />
          </div>
          <motion.span className={styles.coverLeafShade} style={{ opacity: insideShade }} />
        </div>
      </motion.div>
      </motion.div>
    </div>
  );
}
