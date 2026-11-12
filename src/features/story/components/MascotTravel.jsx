import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import styles from './MascotTravel.module.css';

// 저장이 바로 끝나면 아무것도 보이지 않게, 조금 기다렸다가 시작해요.
const START_DELAY_MS = 120;
const LEAVE_MS = 260;
// 날아가는 시간이에요. 너무 빠르면 어디로 갔는지 놓쳐서, 천천히 따라볼 수 있게 했어요.
const FLY_MS = 1100;
// 버튼 위에 앉을 때 캐릭터 높이(px)예요. 원래보다 크면 이만큼으로 줄여요.
const LANDED_HEIGHT = 96;
// 캐릭터 발밑이 버튼 윗변에 살짝 걸치게 해요.
const LANDING_OVERLAP = 4;

// '다음'을 누르고 저장을 기다리는 동안:
//  - 뒤 화면을 살짝 흐리게 덮고, 버튼은 그 위로 올려 또렷하게 보여줘요.
//  - 화면의 캐릭터([data-story-mascot])가 버튼 위로 폴짝 날아가서, 기다리는 동안 통통 뛰어요.
// active: 기다리는 중인지, scopeRef: 캐릭터를 찾을 곳, targetRef: 다음 버튼
// immediate: 기다리지 않고 바로 날아가요. (저장 없이 넘어가는 단계)
// onLanded: 버튼에 내려앉으면 불러요. 캐릭터를 찾지 못했으면 바로 불러요.
function MascotTravel({ active, scopeRef, targetRef, immediate = false, onLanded }) {
  // idle → in(보이는 중) → out(사라지는 중) → idle
  const [phase, setPhase] = useState('idle');
  const travelRef = useRef(null);
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
    const source = scopeRef.current?.querySelector('[data-story-mascot]');
    const target = targetRef.current;
    const landed = () => onLandedRef.current?.();
    if (!travel || !source || !target) {
      landed();
      return undefined;
    }

    // 화면이 비율대로 줄어 있을 수 있어서, 실제로 보이는 크기와 원래 크기의 비율로 크기를 맞춰요.
    const from = source.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    const width = source.offsetWidth;
    const height = source.offsetHeight;
    if (!width || !height || !from.width) {
      landed();
      return undefined;
    }

    const clone = source.cloneNode(true);
    clone.removeAttribute('data-story-mascot');
    clone.style.margin = '0';
    travel.style.width = `${width}px`;
    travel.style.height = `${height}px`;
    travel.querySelector(`.${styles.hop}`).replaceChildren(clone);

    const startScale = from.width / width;
    const endScale = Math.min(startScale, LANDED_HEIGHT / height);
    const startX = from.left;
    const startY = from.top;
    const endX = to.left + to.width / 2 - (width * endScale) / 2;
    const endY = to.top + LANDING_OVERLAP - height * endScale;
    // 위로 솟았다가 버튼에 내려앉는 포물선이에요. 꼭대기가 화면 위로 나가지 않게 해요.
    const peakY = Math.max(Math.min(8, startY), Math.min(startY, endY) - 90);
    const at = (x, y, scale) => `translate(${x}px, ${y}px) scale(${scale})`;

    source.style.visibility = 'hidden';
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const flight = travel.animate(
      reduced
        ? [{ transform: at(endX, endY, endScale) }, { transform: at(endX, endY, endScale) }]
        : [
          { transform: at(startX, startY, startScale), offset: 0 },
          { transform: at((startX + endX) / 2, peakY, (startScale + endScale) / 2), offset: 0.5, easing: 'cubic-bezier(.3,0,.6,1)' },
          { transform: at(endX, endY, endScale), offset: 1 },
        ],
      { duration: reduced ? 0 : FLY_MS, easing: 'cubic-bezier(.33,0,.4,1)', fill: 'forwards' },
    );
    flight.finished.then(() => {
      travel.setAttribute('data-landed', '');
      landed();
    }, () => {});

    // 사라지는 동안에는 날던 자리 그대로 흐려져요. (애니메이션은 레이어와 함께 없어져요)
    // 같은 화면에 남아 있으면(저장 실패) 캐릭터를 제자리에 다시 보여줘요.
    return () => {
      source.style.visibility = '';
    };
  }, [phase, scopeRef, targetRef]);

  if (phase === 'idle') return null;

  // 흐린 막은 버튼 아래, 캐릭터는 버튼 위에 놓여요. (버튼은 z-index 31로 그 사이에 올려 줘요)
  const leaving = phase === 'out' || undefined;
  return (
    <>
      <div className={styles.backdrop} data-leaving={leaving} aria-hidden="true" />
      <div className={styles.travel} data-leaving={leaving} ref={travelRef} aria-hidden="true">
        <div className={styles.hop} />
      </div>
    </>
  );
}

export default MascotTravel;
