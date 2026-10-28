import { useState } from 'react';
import StoryNoticeDialog from '../../story/components/StoryNoticeDialog';
import dialogStyles from '../../story/components/StoryDraftModal.module.css';
import styles from './WithdrawModal.module.css';

// 탈퇴하려면 현재 비밀번호를 다시 입력해야 해요. onConfirm(password)는 실패하면 이유(문장)를 돌려줘요.
function WithdrawModal({ onConfirm, onClose }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!password || submitting) return;

    setSubmitting(true);
    setError('');
    const message = await onConfirm(password);
    setSubmitting(false);
    if (message) setError(message);
  };

  return (
    <StoryNoticeDialog
      title="정말 탈퇴하시겠어요?"
      description={(
        <>
          <span className={styles.sentence}>탈퇴하면 모든 기기에서 로그아웃되고 만든 동화도 볼 수 없어요.</span>
          <span className={styles.sentence}>계속하려면 현재 비밀번호를 입력해 주세요.</span>
        </>
      )}
      labelId="withdraw-title"
    >
      <form onSubmit={handleSubmit}>
        <input
          className={styles.input}
          type="password"
          name="currentPassword"
          autoComplete="current-password"
          aria-label="현재 비밀번호"
          placeholder="현재 비밀번호"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={dialogStyles.actions}>
          <button className={dialogStyles.secondary} type="button" onClick={onClose}>
            취소
          </button>
          <button className={dialogStyles.primary} type="submit" disabled={!password || submitting}>
            {submitting ? '처리하는 중…' : '탈퇴하기'}
          </button>
        </div>
      </form>
    </StoryNoticeDialog>
  );
}

export default WithdrawModal;
