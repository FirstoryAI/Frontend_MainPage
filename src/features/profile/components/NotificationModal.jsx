import { useEffect, useRef, useState } from 'react';
import closeIcon from '../../../assets/notification/close.svg';
import toggleOff from '../../../assets/notification/toggle-off.svg';
import toggleOn from '../../../assets/notification/toggle-on.svg';
import { loadNotificationSettings, saveNotificationSettings } from '../notificationSettings';
import styles from './NotificationModal.module.css';

const settings = [
  { id: 'email', label: '이메일 알림' },
  { id: 'kakao', label: '카카오톡 알림' },
  { id: 'marketing', label: '마케팅 알림 수신' },
];

function NotificationModal({ onClose }) {
  const closeButton = useRef(null);
  const [dialogScale, setDialogScale] = useState(1);
  const [notifications, setNotifications] = useState(loadNotificationSettings);

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
        ? (window.innerWidth - 32) / 560
        : window.innerWidth / 1440;
      const heightScale = (window.innerHeight - headerHeight - 32) / 352;
      setDialogScale(Math.max(0.4, Math.min(1, widthScale, heightScale)));
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const toggleSetting = (id) => {
    const isTurningOn = !notifications[id];
    const updated = { ...notifications, [id]: isTurningOn };
    setNotifications(updated);
    saveNotificationSettings(updated);
  };

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
                <img src={notifications[id] ? toggleOn : toggleOff} alt="" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default NotificationModal;
