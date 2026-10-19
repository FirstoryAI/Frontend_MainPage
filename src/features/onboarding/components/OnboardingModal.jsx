import { useEffect, useRef } from 'react';
import CtaButton from '../../../components/ui/CtaButton';
import badgeCircle from '../../../assets/icons/badge-circle.svg';
import iconClose from '../../../assets/icons/icon-close.svg';
import styles from './OnboardingModal.module.css';

const steps = [
  '아이에게 있었던 일을 짧게 알려 주세요',
  'FIRSTORY AI와 몇 가지 질문으로 생각을 정리해요',
  '맞춤 동화와 대화 가이드가 만들어지면, 먼저 읽어보고 정해요',
  '아이와 함께 읽으며 이야기를 나눠요',
];

function OnboardingModal({ onStart, onClose }) {
  const startButtonRef = useRef(null);

  useEffect(() => {
    startButtonRef.current?.focus();
  }, []);

  return (
    <div className={styles.overlay}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <button
          className={styles.closeButton}
          type="button"
          aria-label="닫기"
          onClick={onClose}
        >
          <img src={iconClose} alt="" />
        </button>

        <h2 id="onboarding-title" className={styles.title}>
          <span className={styles.brand}>FIRSTORY</span>
          <span className={styles.titleText}>는 이렇게 함께해요</span>
        </h2>

        <ol className={styles.steps}>
          {steps.map((step, index) => (
            <li className={styles.step} key={step}>
              <span className={styles.badge} aria-hidden="true">
                <img src={badgeCircle} alt="" />
                <span>{index + 1}</span>
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <CtaButton
          className={styles.startButton}
          onClick={onStart}
          ref={startButtonRef}
        >
          첫 동화 만들기
        </CtaButton>
      </div>
    </div>
  );
}

export default OnboardingModal;
