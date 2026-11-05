import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotifications } from '../../features/notifications/useNotifications';
import { getStoryDetail } from '../../services/storiesApi';
import { libraryGroup } from '../../features/story/storyMappers';
import iconBell from '../../assets/icons/icon-bell.svg';
import styles from './NotificationBell.module.css';

const MAX_BADGE = 9;

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function getNotificationHref(item) {
  // Older notifications already in localStorage still carry the original /library URL.
  if (item.href && item.href !== '/library') return item.href;
  if (item.id?.endsWith('-done')) return '/library?filter=REVIEWING';
  if (item.id?.endsWith('-failed')) return '/library?filter=FAILED';
  return item.href || '/library';
}

function filterForGroup(group) {
  if (group === 'REVIEWING' || group === 'UNREAD' || group === 'READ' || group === 'FAILED') return group;
  if (group === 'CREATING') return 'CREATING';
  return null;
}

// 오른쪽 위 알림 버튼이에요. 안 읽은 알림 수를 뱃지로 보여주고, 누르면 알림 내용을 펼쳐 보여줘요.
function NotificationBell() {
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  // 열 때 아직 안 읽은 알림은 이번에 펼친 동안 강조해서 보여줘요.
  const [freshIds, setFreshIds] = useState([]);
  const root = useRef(null);
  const button = useRef(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  // 열려 있는 동안 도착한 알림도 바로 읽은 것으로 해서 뱃지가 남지 않게 해요.
  useEffect(() => {
    if (open && unreadCount > 0) markAllRead();
  }, [open, unreadCount, markAllRead]);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    setFreshIds(notifications.filter((item) => !item.read).map((item) => item.id));
    setOpen(true);
  };

  const openNotification = async (event, item) => {
    if (!item.id?.endsWith('-done')) {
      setOpen(false);
      return;
    }

    // Completion alerts can outlive the review step, so route by this story's current library state.
    event.preventDefault();
    setOpen(false);
    const match = item.id.match(/^story-(.+)-[^-]+-done$/);
    if (!match) {
      navigate(getNotificationHref(item));
      return;
    }

    try {
      const story = await getStoryDetail(match[1]);
      const filter = filterForGroup(libraryGroup(story));
      navigate(filter ? `/library?filter=${filter}` : getNotificationHref(item));
    } catch {
      navigate(getNotificationHref(item));
    }
  };

  const label = unreadCount > 0 ? `알림, 새 알림 ${unreadCount}개` : '알림';

  return (
    <div className={styles.root} ref={root}>
      <button
        ref={button}
        className={styles.button}
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={toggle}
      >
        <img src={iconBell} alt="" />
        {unreadCount > 0 && (
          <span className={styles.badge} aria-hidden="true">
            {unreadCount > MAX_BADGE ? `${MAX_BADGE}+` : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section className={styles.panel} id={panelId} role="dialog" aria-label="알림">
          <h2 className={styles.heading}>알림</h2>
          {notifications.length === 0 ? (
            <p className={styles.empty}>새로운 알림이 없어요.</p>
          ) : (
            <ul className={styles.list}>
              {notifications.map((item) => (
                <li key={item.id}>
                  <Link
                    className={`${styles.item} ${freshIds.includes(item.id) ? styles.fresh : ''}`}
                    to={getNotificationHref(item)}
                    onClick={(event) => openNotification(event, item)}
                  >
                    <span className={styles.itemTitle}>{item.title}</span>
                    <span className={styles.itemMessage}>{item.message}</span>
                    <time className={styles.itemTime} dateTime={item.createdAt}>
                      {formatTime(item.createdAt)}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

export default NotificationBell;
