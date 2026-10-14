import { useState } from 'react';
import EditModal from './EditModal';
import styles from './TextEditModal.module.css';

// 상황, 이번 이야기에서 나누고 싶은 것처럼 글 한 덩어리를 고치는 모달이에요.
function TextEditModal({ title, titleId, label, initialValue, onSave, onClose }) {
  const [value, setValue] = useState(initialValue);

  return (
    <EditModal
      title={title}
      titleId={titleId}
      compact
      saveDisabled={!value.trim()}
      onSave={() => onSave(value.trim())}
      onClose={onClose}
    >
      <textarea
        className={styles.textarea}
        aria-label={label}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onFocus={(event) => {
          // 처음 열릴 때 커서를 글 끝에 둬요.
          const { length } = event.target.value;
          event.target.setSelectionRange(length, length);
        }}
        autoFocus
      />
    </EditModal>
  );
}

export default TextEditModal;
