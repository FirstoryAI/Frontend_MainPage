import { useEffect, useRef } from 'react';
import iconClose from '../../../assets/icons/icon-close.svg';
import styles from './EditModal.module.css';

// 마무리 화면의 수정 모달 공통 틀(흐린 배경, 흰 카드, 제목, X, 저장하기).
// 저장하기를 눌러야 반영되고, X나 Esc로 닫으면 고친 내용은 버려져요. 배경을 눌러도 닫히지 않아요.
function EditModal({
  title,
  titleId,
  compact = false,
  saveDisabled = false,
  onSave,
  onClose,
  children,
}) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);

  // 안쪽 입력 칸이 autoFocus로 이미 포커스를 가져갔다면 그대로 두고, 아니면 X 버튼에 맞춰요.
  useEffect(() => {
    if (!dialogRef.current?.contains(document.activeElement)) {
      closeButtonRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className={styles.overlay}>
      <div
        className={`${styles.modal} ${compact ? styles.compact : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
      >
        <button
          className={styles.closeButton}
          type="button"
          aria-label="닫기"
          onClick={onClose}
          ref={closeButtonRef}
        >
          <img src={iconClose} alt="" />
        </button>

        <h2 className={styles.title} id={titleId}>
          {title}
        </h2>

        {children}

        <button
          className={styles.saveButton}
          type="button"
          disabled={saveDisabled}
          onClick={onSave}
        >
          저장하기
        </button>
      </div>
    </div>
  );
}

export default EditModal;
