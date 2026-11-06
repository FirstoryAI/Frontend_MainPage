import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import closeIcon from '../../../assets/notification/close.svg';
import { loadNotificationSettings, saveNotificationSettings } from '../notificationSettings';
import { getCurrentMember } from '../../../services/homeApi';
import { setEmailNotify } from '../../../services/meApi';
import styles from './NotificationModal.module.css';

const settings = [
  { id: 'email', label: '이메일 알림' },
  { id: 'marketing', label: '마케팅 알림 수신' },
];

function NotificationModal({ onClose }) {
  const closeButton = useRef(null);
  const [notifications, setNotifications] = useState(loadNotificationSettings);
  const [error, setError] = useState('');

  // 이메일 알림은 서버 동의를 따르고, 마케팅 표시 설정은 이 브라우저에 저장해요.
  useEffect(() => {
    let active = true;
    getCurrentMember()
      .then((member) => active && setNotifications((current) => ({ ...current, email: Boolean(member.emailNotify) })))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

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

  const toggleSetting = async (id) => {
    const isTurningOn = !notifications[id];
    const updated = { ...notifications, [id]: isTurningOn };
    setNotifications(updated);
    setError('');

    if (id !== 'email') {
      saveNotificationSettings(updated);
      return;
    }

    try {
      await setEmailNotify(isTurningOn);
    } catch (requestError) {
      setNotifications((current) => ({ ...current, email: !isTurningOn }));
      setError(requestError.message || '알림 설정을 바꾸지 못했어요.');
    }
  };

  return (
    createPortal(<div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 className={styles.title} id="notification-title">알림</h2>
        <button
          ref={closeButton}
          className={styles.closeButton}
          type="button"
          onClick={onClose}
          aria-label="알림 설정 닫기"
        >
          <img src={closeIcon} alt="" />
        </button>

        <p className={styles.description}>동화 완성 알림</p>
        <div className={styles.settings}>
          {settings.map(({ id, label }) => (
            <div className={styles.setting} key={id}>
              <span className={id === 'email' ? styles.emailLabel : styles.settingLabel}>{label}</span>
              <button
                className={styles.toggle}
                type="button"
                role="switch"
                aria-checked={notifications[id]}
                aria-label={label}
                onClick={() => toggleSetting(id)}
              >
                <span className={styles.knob} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </section>
    </div>, document.body)
  );
}

export default NotificationModal;
