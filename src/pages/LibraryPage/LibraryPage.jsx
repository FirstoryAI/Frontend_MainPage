import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import iconBell from '../../assets/icons/icon-bell.svg';
import avatarCircle from '../../assets/icons/avatar-circle.svg';
import avatarPerson from '../../assets/icons/avatar-person.svg';
import bookCover from '../../assets/images/library-book-cover.png';
import styles from './LibraryPage.module.css';

const filters = [
  { value: 'all', label: '전체' },
  { value: 'creating', label: '제작 중' },
  { value: 'reviewing', label: '확인을 기다려요' },
  { value: 'unread', label: '아직 읽지 않았어요' },
  { value: 'completed', label: '함께 읽었어요' },
];

const stories = [
  {
    id: 1,
    status: 'creating',
    badge: '제작 중 · 그림 그리기',
    title: '공룡 아로의 새 친구',
    meta: '친구 관계 · 오늘',
  },
  {
    id: 2,
    status: 'reviewing',
    badge: '확인을 기다려요',
    title: '이삿짐 상자 속 별',
    meta: '이사 · 10월 6일',
  },
  {
    id: 3,
    status: 'unread',
    badge: '아직 읽지 않았어요',
    title: '처음 가는 치과',
    meta: '병원 · 9월 28일',
  },
  {
    id: 4,
    status: 'completed',
    badge: '함께 읽었어요',
    title: '동생이 생겼어요',
    meta: '가족 · 9월 12일',
  },
  {
    id: 5,
    status: 'failed',
    badge: '만들지 못했어요',
    title: '유치원 첫날',
    meta: '등원 · 9월 2일',
  },
];

function LibraryPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('all');

  const visibleStories = useMemo(
    () =>
      activeFilter === 'all'
        ? stories
        : stories.filter((story) => story.status === activeFilter),
    [activeFilter],
  );

  return (
    <div className={styles.page}>
      <Sidebar />

      <div className={styles.main}>
        <div className={styles.topbar}>
          <button
            className={styles.bellButton}
            type="button"
            aria-label="알림"
            disabled
            title="알림 화면이 준비되면 연결됩니다"
          >
            <img src={iconBell} alt="" />
          </button>
          <div className={styles.avatar} role="img" aria-label="내 프로필">
            <img className={styles.avatarCircle} src={avatarCircle} alt="" />
            <img className={styles.avatarPerson} src={avatarPerson} alt="" />
          </div>
        </div>

        <main className={styles.content}>
          <h1 className={styles.title}>서재</h1>

          <div className={styles.filters} aria-label="동화 상태 필터">
            {filters.map((filter) => (
              <button
                key={filter.value}
                className={`${styles.filter} ${
                  activeFilter === filter.value ? styles.filterActive : ''
                }`}
                type="button"
                aria-pressed={activeFilter === filter.value}
                onClick={() => setActiveFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <section className={styles.storyGrid} aria-live="polite">
            {visibleStories.map((story) => (
              <article className={styles.storyCard} key={story.id}>
                <span
                  className={`${styles.badge} ${styles[story.status]}`}
                >
                  {story.badge}
                </span>
                <img
                  className={styles.cover}
                  src={bookCover}
                  alt={`${story.title} 표지`}
                />
                <h2 className={styles.storyTitle}>{story.title}</h2>
                <div className={styles.storyFooter}>
                  <p className={styles.storyMeta}>{story.meta}</p>
                  {story.status === 'failed' && (
                    <button
                      className={styles.retryButton}
                      type="button"
                      onClick={() => navigate(`/story/${story.id}/remake`)}
                    >
                      다시 만들기
                    </button>
                  )}
                </div>
              </article>
            ))}
          </section>
        </main>
      </div>
    </div>
  );
}

export default LibraryPage;
