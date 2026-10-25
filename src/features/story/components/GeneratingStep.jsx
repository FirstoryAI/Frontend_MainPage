import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CtaButton from '../../../components/ui/CtaButton';
import { useGenerationStage } from '../hooks/useGenerationStage';
import runner from '../../../assets/images/story-runner.png';
import circleActive from '../../../assets/icons/step-circle-active.svg';
import circlePending from '../../../assets/icons/step-circle-pending.svg';
import circleDone from '../../../assets/icons/step-circle-done.svg';
import glyphBook from '../../../assets/icons/step-book.svg';
import glyphPencil from '../../../assets/icons/step-pencil.svg';
import glyphBrush from '../../../assets/icons/step-brush.svg';
import glyphCheck from '../../../assets/icons/step-check.svg';
import iconHomeWhite from '../../../assets/icons/icon-home-white.svg';
import styles from './GeneratingStep.module.css';

const stages = [
  { label: '이야기 짜기', title: '이야기를 짜고 있어요', glyph: glyphBook },
  { label: '글 쓰기', title: '글을 쓰고 있어요', glyph: glyphPencil },
  { label: '그림 그리기', title: '그림을 그리고 있어요', glyph: glyphBrush },
];

// 마스코트가 현재 단계 아이콘 바로 위에 오도록 하는 가로 중심 위치
const runnerCenter = ['18px', '50%', 'calc(100% - 18px)'];

// 동화 생성 API가 생기기 전까지, 마지막 단계(그림 그리기)를 이만큼(ms) 보여준 뒤 완료로 넘겨요.
// 서버의 완료 신호가 연결되면 이 대기 시간 대신 그 신호로 onComplete를 부르면 돼요.
const LAST_STAGE_HOLD = 4000;

// 알림 받을 번호는 아직 가져올 곳이 없어 화면 예시 값을 보여줘요.
const PHONE_PLACEHOLDER = '010-****-1234';

function circleFor(index, stage) {
  if (index < stage) {
    return circleDone;
  }
  return index === stage ? circleActive : circlePending;
}

function lineClass(index, stage) {
  if (stage <= index) {
    return styles.line;
  }
  // 마지막으로 이어진 줄은 Figma에서 조금 더 연한 초록이에요.
  return `${styles.line} ${index === stages.length - 2 ? styles.lineDoneSoft : styles.lineDone}`;
}

function GeneratingStep({ stage: controlledStage, onComplete }) {
  const navigate = useNavigate();
  const onCompleteRef = useRef(onComplete);
  const timedStage = useGenerationStage();
  const stage = controlledStage ?? timedStage;

  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  useEffect(() => {
    if (stage !== stages.length - 1) return undefined;

    const timer = setTimeout(() => onCompleteRef.current?.(), LAST_STAGE_HOLD);
    return () => clearTimeout(timer);
  }, [stage]);

  return (
    <div className={styles.step}>
      <div className={styles.stepper}>
        <img
          className={styles.runner}
          src={runner}
          alt=""
          width="103"
          height="110"
          style={{ left: runnerCenter[stage] }}
        />

        <ol className={styles.stages}>
          {stages.map((item, index) => (
            <li
              className={`${styles.stage} ${index <= stage ? styles.reached : ''}`}
              key={item.label}
              aria-current={index === stage ? 'step' : undefined}
            >
              <div className={styles.node}>
                <span className={styles.icon}>
                  <img src={circleFor(index, stage)} alt="" />
                  <img
                    className={styles.glyph}
                    src={index < stage ? glyphCheck : item.glyph}
                    alt=""
                  />
                </span>
                <span className={styles.label}>{item.label}</span>
              </div>
              {index < stages.length - 1 && (
                <span className={lineClass(index, stage)} aria-hidden="true" />
              )}
            </li>
          ))}
        </ol>
      </div>

      <h1 className={styles.title} role="status">
        {stages[stage].title}
      </h1>
      <p className={styles.notice}>
        보통 3~4분 정도 걸려요. 화면을 나가도 동화는 계속 만들어져요.
      </p>

      <div className={styles.card}>
        <p className={styles.cardText}>다 되면 카카오톡으로 알려드려요</p>
        <p className={styles.phone}>{PHONE_PLACEHOLDER}</p>
        <button
          className={styles.changeButton}
          type="button"
          disabled
          title="번호 변경 화면이 준비되면 연결됩니다"
        >
          번호 바꾸기
        </button>
      </div>

      <div className={styles.footer}>
        <CtaButton
          pill
          iconOnly
          icon={iconHomeWhite}
          aria-label="홈으로 가기"
          onClick={() => navigate('/home')}
        />
      </div>
    </div>
  );
}

export default GeneratingStep;
