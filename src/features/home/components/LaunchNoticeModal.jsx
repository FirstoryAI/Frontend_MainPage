import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './LaunchNoticeModal.module.css';

function LaunchNoticeModal({ onClose, onConfirm }) {
  const confirmButton = useRef(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    confirmButton.current?.focus();
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
        <h2 id="launch-notice-title">무료로 만들 수 있는 동화를<br />모두 만들었어요.</h2>
        <button ref={confirmButton} className={styles.action} type="button" onClick={onConfirm}>
          확인
        </button>
      </section>
    </div>, document.body,
  );
}

export default LaunchNoticeModal;
