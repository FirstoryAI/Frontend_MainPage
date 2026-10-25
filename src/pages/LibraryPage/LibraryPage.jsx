import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import NotificationBell from '../../components/layout/NotificationBell';
import StorySavedModal from '../../features/library/components/StorySavedModal';
import avatarCircle from '../../assets/icons/avatar-circle.svg';
import avatarPerson from '../../assets/icons/avatar-person.svg';
import bookCover from '../../assets/images/library-book-cover.png';
import { getHome } from '../../services/homeApi';
import { getStories } from '../../services/libraryApi';
import styles from './LibraryPage.module.css';

const filters = [
  { value: 'ALL', label: '전체' },
  { value: 'CREATING', label: '제작 중', countKey: 'creating' },
  { value: 'REVIEWING', label: '확인을 기다려요', countKey: 'reviewing' },
  { value: 'UNREAD', label: '아직 읽지 않았어요', countKey: 'unread' },
  { value: 'READ', label: '함께 읽었어요', countKey: 'read' },
  { value: 'FAILED', label: '만들지 못했어요', countKey: 'failed' },
];

const statusLabels = {
  DRAFT: '제작 중', CREATING: '제작 중', REVIEWING: '확인을 기다려요',
  UNREAD: '아직 읽지 않았어요', READ: '함께 읽었어요', FAILED: '만들지 못했어요',
};

const statusClasses = {
  DRAFT: 'creating', CREATING: 'creating', REVIEWING: 'reviewing',
  UNREAD: 'unread', READ: 'read', FAILED: 'failed',
};

function formatStoryDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' }).format(date);
}

// 확인을 기다리는 동화는 미리보기, 읽을 수 있는 동화(아직 읽지 않았어요·함께 읽었어요)는 동화 상세로 열려요.
const openableStatuses = ['REVIEWING', 'UNREAD', 'READ'];

function LibraryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  // 미리보기에서 '이대로 확정'으로 넘어오면 '서재에 저장했어요' 팝업을 보여줘요.
  const [savedStory] = useState(() => (location.state?.newlyCreated ? (location.state.story ?? {}) : null));
  const [savedModalOpen, setSavedModalOpen] = useState(savedStory !== null);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [stories, setStories] = useState([]);
  const [counts, setCounts] = useState({});
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getHome().then((home) => {
      if (home?.counts) setCounts((previous) => ({ ...previous, ...home.counts }));
    }).catch(() => {
      // The list is still usable when tab counts are unavailable.
    });
  }, []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError('');

    getStories({ filter: activeFilter, page: 0, size: 20 }).then((result) => {
      if (!active) return;
      setStories(result.items || []);
      setPage(result.page ?? 0);
      setHasNext(Boolean(result.hasNext));
      if (activeFilter === 'ALL') {
        setCounts((previous) => ({ ...previous, all: result.totalElements }));
      }
      setError('');
      setIsLoading(false);
    }).catch((requestError) => {
      if (!active) return;
      setStories([]);
      setHasNext(false);
      setError(requestError.message || '서재 목록을 불러오지 못했어요.');
      setIsLoading(false);
    });

    return () => { active = false; };
  }, [activeFilter]);

  const closeSavedModal = () => {
    setSavedModalOpen(false);
    navigate(location.pathname, { replace: true, state: null });
  };

  const readSavedStory = () => {
    navigate(`/library/${savedStory.id ?? 'new'}`, { state: { story: savedStory } });
  };

  const openStory = (story, status) => {
    if (status === 'REVIEWING') {
      navigate('/story/preview', { state: { story } });
      return;
    }
    navigate(`/library/${story.id}`, { state: { story } });
  };

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    setError('');
    try {
      const result = await getStories({ filter: activeFilter, page: page + 1, size: 20 });
      setStories((current) => [...current, ...(result.items || [])]);
      setPage(result.page ?? page + 1);
      setHasNext(Boolean(result.hasNext));
    } catch (requestError) {
      setError(requestError.message || '동화를 더 불러오지 못했어요.');
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <>
      <div className={styles.page} inert={savedModalOpen}>
        <Sidebar />

        <div className={styles.main}>
          <div className={styles.topbar}>
            <NotificationBell />
            <button
              className={styles.avatarButton}
              type="button"
              onClick={() => navigate('/mypage')}
              aria-label="마이페이지"
            >
              <img className={styles.avatarCircle} src={avatarCircle} alt="" />
              <img className={styles.avatarPerson} src={avatarPerson} alt="" />
            </button>
          </div>

          <main className={styles.content}>
            <h1 className={styles.title}>서재</h1>

            <div className={styles.filters} aria-label="동화 상태 필터">
              {filters.map((filter) => (
                <button
                  key={filter.value}
                  className={`${styles.filter} ${activeFilter === filter.value ? styles.filterActive : ''}`}
                  type="button"
                  aria-pressed={activeFilter === filter.value}
                  onClick={() => setActiveFilter(filter.value)}
                >
                  {filter.label}{counts[filter.countKey || 'all'] != null && ` ${counts[filter.countKey || 'all']}`}
                </button>
              ))}
            </div>

            {error && <p className={styles.error} role="alert">{error}</p>}
            <section className={styles.storyGrid} aria-live="polite" aria-busy={isLoading}>
              {isLoading ? <p className={styles.message}>서재를 불러오는 중이에요.</p> : stories.map((story) => {
                const status = String(story.status || '').toUpperCase();
                const storyTitle = story.title || '제목을 준비하고 있어요';
                const meta = [story.childDisplayName, formatStoryDate(story.updatedAt || story.createdAt)]
                  .filter(Boolean).join(' · ');
                return (
                  <article className={styles.storyCard} key={story.id}>
                    <span className={`${styles.badge} ${styles[statusClasses[status]] || ''}`}>
                      {story.label || statusLabels[status] || '동화'}
                    </span>
                    <img className={styles.cover} src={story.coverUrl || bookCover} alt={story.title ? `${story.title} 표지` : '동화 표지'} />
                    <h2 className={styles.storyTitle}>
                      {openableStatuses.includes(status) ? (
                        <button className={styles.storyOpen} type="button" onClick={() => openStory(story, status)}>
                          {storyTitle}
                        </button>
                      ) : storyTitle}
                    </h2>
                    <div className={styles.storyFooter}>
                      <p className={styles.storyMeta}>{meta}</p>
                      {status === 'FAILED' && (
                        <button className={styles.retryButton} type="button" onClick={() => navigate(`/story/${story.id}/remake`)}>
                          다시 만들기
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
              {!isLoading && !error && stories.length === 0 && (
                <p className={styles.message}>이 조건에 해당하는 동화가 없어요.</p>
              )}
            </section>
            {hasNext && !isLoading && (
              <button className={styles.loadMore} type="button" onClick={handleLoadMore} disabled={isLoadingMore}>
                {isLoadingMore ? '불러오는 중…' : '더 보기'}
              </button>
            )}
          </main>
        </div>
      </div>
      {savedModalOpen && <StorySavedModal onClose={closeSavedModal} onRead={readSavedStory} />}
    </>
  );
}

export default LibraryPage;
