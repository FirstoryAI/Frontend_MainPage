import { useEffect, useRef } from 'react';
import closeIcon from '../../../assets/icons/scenario-modal-close.svg';
import mascot from '../../../assets/images/library-saved-mascot.webp';
import styles from './StorySavedModal.module.css';

// 미리보기에서 '이대로 확정'을 누르면 서재에서 보이는 '서재에 저장했어요' 팝업이에요.
function StorySavedModal({ onClose, onRead }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={styles.dialog}
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="story-saved-title"
        aria-describedby="story-saved-description"
      >
        <button className={styles.closeButton} type="button" onClick={onClose} aria-label="팝업 닫기">
          <img src={closeIcon} alt="" />
        </button>

        <img className={styles.mascot} src={mascot} alt="" />
        <h2 className={styles.title} id="story-saved-title">서재에 저장했어요</h2>
        <p className={styles.description} id="story-saved-description">
          <span>아이와 읽기 전에 대화 가이드를 먼저 살펴보면,</span>
          <span>어느 부분에서 어떤 질문을 하면 좋을지 알 수 있어요</span>
        </p>

        <div className={styles.actions}>
          <button className={styles.primary} type="button" onClick={onClose}>
            서재로 바로 가기
          </button>
          <button className={styles.secondary} type="button" onClick={onRead}>
            아이와 바로 읽기
          </button>
        </div>
      </section>
    </div>
  );
}

export default StorySavedModal;
