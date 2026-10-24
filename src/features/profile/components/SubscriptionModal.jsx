import { useEffect, useRef, useState } from 'react';
import closeIcon from '../../../assets/notification/close.svg';
import divider from '../../../assets/subscription/divider.svg';
import styles from './SubscriptionModal.module.css';

function SubscriptionModal({ onClose }) {
  const closeButton = useRef(null);
  const [dialogScale, setDialogScale] = useState(1);

  useEffect(() => {
    const previousFocus = document.activeElement;
    closeButton.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [onClose]);

  useEffect(() => {
    const updateScale = () => {
      const headerHeight = window.innerWidth <= 760
        ? 76
        : window.innerHeight <= 850 ? 88 : 109;
      const widthScale = window.innerWidth <= 760
        ? (window.innerWidth - 32) / 825
        : window.innerWidth / 1440;
      const heightScale = (window.innerHeight - headerHeight - 32) / 371;
      setDialogScale(Math.max(0.4, Math.min(1, widthScale, heightScale)));
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={styles.dialog}
        style={{ '--dialog-scale': dialogScale }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="subscription-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          ref={closeButton}
          className={styles.closeButton}
          type="button"
          onClick={onClose}
          aria-label="구독 관리 닫기"
        >
          <img src={closeIcon} alt="" />
        </button>

        <h2 className={styles.planName} id="subscription-title">Standard 플랜</h2>
        <p className={styles.price}>
          <span>매달</span>
          <strong>16,500원</strong>
        </p>
        <div className={styles.divider} aria-hidden="true">
          <img src={divider} alt="" />
        </div>
        <ul className={styles.benefits}>
          <li>맞춤 동화 4권 생성권</li>
          <li>AI 육아 전문가</li>
          <li>대화 가이드</li>
        </ul>

        <button className={styles.cancelButton} type="button" onClick={onClose}>
          해지하기
        </button>
        <button className={styles.keepButton} type="button" onClick={onClose}>
          유지하기
        </button>
      </section>
    </div>
  );
}

export default SubscriptionModal;
