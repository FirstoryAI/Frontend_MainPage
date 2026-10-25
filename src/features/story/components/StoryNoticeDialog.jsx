import { useEffect, useRef } from 'react';
import styles from './StoryDraftModal.module.css';

// 동화 만들기 중에 안내를 드리거나 선택을 받을 때 쓰는 작은 팝업이에요. (디자인에 따로 없어 기존 팝업 모양을 따랐어요)
function StoryNoticeDialog({ title, description, children, labelId = 'story-notice-title' }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  return (
    <div className={styles.overlay}>
      <section
        className={`${styles.dialog} ${styles.noticeDialog}`}
        ref={dialogRef}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={labelId}
      >
        <h2 id={labelId} className={styles.title}>{title}</h2>
        {description && <p className={styles.description}>{description}</p>}
        {children}
      </section>
    </div>
  );
}

export default StoryNoticeDialog;
