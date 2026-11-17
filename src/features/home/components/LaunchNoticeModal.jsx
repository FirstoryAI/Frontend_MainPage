import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { setEmailNotify } from '../../../services/meApi';
import closeIcon from '../../../assets/notification/close.svg';
import styles from './LaunchNoticeModal.module.css';

function LaunchNoticeModal({ onClose }) {
  const closeButton = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState('');

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

  const subscribe = async () => {
    if (submitting || subscribed) return;
    setSubmitting(true);
    setError('');
    try {
      await setEmailNotify(true);
      setSubscribed(true);
    } catch (requestError) {
      setError(requestError.message || '알림을 신청하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className={styles.backdrop} onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="launch-notice-title">
        <button ref={closeButton} className={styles.close} type="button" onClick={onClose} aria-label="닫기">
          <img src={closeIcon} alt="" />
        </button>
        <h2 id="launch-notice-title">정식 출시 알림 받기</h2>
        <p>무료 동화 생성 횟수를 모두 사용했어요.<br />정식 출시 소식을 이메일로 알려드릴게요.</p>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <button className={styles.action} type="button" onClick={subscribed ? onClose : subscribe} disabled={submitting}>
          {subscribed ? '알림 신청이 완료됐어요' : submitting ? '신청하는 중…' : '정식 출시 알림 받기'}
        </button>
      </section>
    </div>, document.body,
  );
}

export default LaunchNoticeModal;
