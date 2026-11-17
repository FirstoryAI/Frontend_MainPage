import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import closeIcon from '../../../assets/notification/close.svg';
import styles from './LaunchNoticeModal.module.css';

function LaunchNoticeModal({ onClose }) {
  const closeButton = useRef(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    closeButton.current?.focus();
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus?.();
    };
  }, [onClose]);

  return createPortal(
    <div className={styles.backdrop} onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="launch-notice-title">
        <button ref={closeButton} className={styles.close} type="button" onClick={onClose} aria-label="닫기">
          <img src={closeIcon} alt="" />
        </button>
        <h2 id="launch-notice-title">무료로 만들 수 있는 동화를 모두 만들었어요.</h2>
        <button className={styles.action} type="button" onClick={onClose}>
          확인
        </button>
      </section>
    </div>, document.body,
  );
}

export default LaunchNoticeModal;
