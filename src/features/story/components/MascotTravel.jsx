import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import styles from './MascotTravel.module.css';

// 저장이 바로 끝나면 아무것도 보이지 않게, 조금 기다렸다가 시작해요.
const START_DELAY_MS = 120;
const LEAVE_MS = 260;
// 화면 가운데로 날아오는 시간이에요.
const FLY_MS = 1000;
// 가운데에 앉았을 때 보이는 캐릭터 높이(px)예요. 작은 화면에서는 화면 크기에 맞춰 줄여요.
// 이미지마다 둘레 여백이 달라서, 칸 크기가 아니라 실제로 그려진 캐릭터(--mascot-art) 기준으로 맞춰요.
const LANDED_ART_HEIGHT = 128;
// 캐릭터와 아래 글자 사이 간격, 글자 줄 높이(px)예요. 둘을 한 덩어리로 보고 화면 가운데에 놓아요.
const CAPTION_GAP = 14;
const CAPTION_HEIGHT = 34;

// '다음'을 누르고 저장을 기다리는 동안:
//  - 뒤 화면을 살짝 흐리게 덮어요.
//  - 화면의 캐릭터([data-story-mascot])가 화면 가운데로 날아와서 통통 뛰고, 그 아래에 label을 보여줘요.
// active: 기다리는 중인지, scopeRef: 캐릭터를 찾을 곳, label: 캐릭터 아래 글자(없으면 안 보여요)
// immediate: 기다리지 않고 바로 날아와요. (저장 없이 넘어가는 단계)
// onLanded: 가운데에 내려앉으면 불러요. 캐릭터를 찾지 못했으면 바로 불러요.
function MascotTravel({ active, scopeRef, label = '', immediate = false, onLanded }) {
  // idle → in(보이는 중) → out(사라지는 중) → idle
  const [phase, setPhase] = useState('idle');
  const travelRef = useRef(null);
  const captionRef = useRef(null);
  const onLandedRef = useRef(onLanded);

  useEffect(() => {
    onLandedRef.current = onLanded;
  }, [onLanded]);

  useEffect(() => {
    if (!active) return undefined;
    const timer = setTimeout(() => setPhase('in'), immediate ? 0 : START_DELAY_MS);
    return () => {
      clearTimeout(timer);
      setPhase((current) => (current === 'in' ? 'out' : 'idle'));
    };
  }, [active, immediate]);

  useEffect(() => {
    if (phase !== 'out') return undefined;
    const timer = setTimeout(() => setPhase('idle'), LEAVE_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  useLayoutEffect(() => {
    if (phase !== 'in') return undefined;
    const travel = travelRef.current;
    const caption = captionRef.current;
    const source = scopeRef.current?.querySelector('[data-story-mascot]');
    const landed = () => onLandedRef.current?.();
    if (!travel || !source) {
      landed();
      return undefined;
    }

    // 화면이 비율대로 줄어 있을 수 있어서, 실제로 보이는 크기와 원래 크기의 비율로 크기를 맞춰요.
    const from = source.getBoundingClientRect();
    const width = source.offsetWidth;
    const height = source.offsetHeight;
    if (!width || !height || !from.width) {
      landed();
      return undefined;
    }

    const clone = source.cloneNode(true);
    clone.removeAttribute('data-story-mascot');
    clone.style.margin = '0';
    // 단계마다 칸 크기를 바꾸는 규칙(.intro > div)은 복제본에 닿지 않아서, 원래 칸 크기를 그대로 줘요.
    clone.style.width = '100%';
    clone.style.height = '100%';
    travel.style.width = `${width}px`;
    travel.style.height = `${height}px`;
    travel.querySelector(`.${styles.hop}`).replaceChildren(clone);

    const art = parseFloat(getComputedStyle(source).getPropertyValue('--mascot-art')) || 1;
    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;
    const artHeight = Math.min(LANDED_ART_HEIGHT, viewWidth * 0.32, viewHeight * 0.2);
    const startScale = from.width / width;
    const endScale = artHeight / (height * art);
    // 캐릭터와 글자를 한 덩어리로 화면 가운데에 놓아요.
    const captionSpace = caption ? CAPTION_GAP + CAPTION_HEIGHT : 0;
    const artBottom = (viewHeight - artHeight - captionSpace) / 2 + artHeight;
    const endX = viewWidth / 2 - (width * endScale) / 2;
    const endY = artBottom - height * endScale;
    const at = (x, y, scale) => `translate(${x}px, ${y}px) scale(${scale})`;
    if (caption) caption.style.top = `${artBottom + CAPTION_GAP}px`;

    source.style.visibility = 'hidden';
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // 곧게 미끄러지듯 날아와서 가운데에 사뿐히 멈춰요.
    const flight = travel.animate(
      [
        { transform: reduced ? at(endX, endY, endScale) : at(from.left, from.top, startScale) },
        { transform: at(endX, endY, endScale) },
      ],
      { duration: reduced ? 0 : FLY_MS, easing: 'cubic-bezier(.45, 0, .2, 1)', fill: 'forwards' },
    );
    flight.finished.then(() => {
      travel.setAttribute('data-landed', '');
      caption?.setAttribute('data-landed', '');
      landed();
    }, () => {});

    // 사라지는 동안에는 날던 자리 그대로 흐려져요. (애니메이션은 레이어와 함께 없어져요)
    // 같은 화면에 남아 있으면(저장 실패) 캐릭터를 제자리에 다시 보여줘요.
    return () => {
      source.style.visibility = '';
    };
  }, [phase, scopeRef]);

  if (phase === 'idle') return null;

  const leaving = phase === 'out' || undefined;
  return (
    <>
      <div className={styles.backdrop} data-leaving={leaving} aria-hidden="true" />
      <div className={styles.travel} data-leaving={leaving} ref={travelRef} aria-hidden="true">
        <div className={styles.hop} />
      </div>
      {/* 글자는 화면이 바뀌는 순간 바로 없애요. (흐린 막이 걷힌 새 화면 위에 글자만 남지 않게) */}
      {label && !leaving && (
        <p className={styles.caption} ref={captionRef} role="status">
          {label}
        </p>
      )}
    </>
  );
}

export default MascotTravel;
