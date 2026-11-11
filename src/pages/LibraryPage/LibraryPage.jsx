import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ErrorText from '../../components/ui/ErrorText';
import Sidebar from '../../components/layout/Sidebar';
import NotificationBell from '../../components/layout/NotificationBell';
import StorySavedModal from '../../features/library/components/StorySavedModal';
import avatarCircle from '../../assets/icons/avatar-circle.svg';
import avatarPerson from '../../assets/icons/avatar-person.svg';
import bookCover from '../../assets/images/library-cover-sample.png';
import emptyMascot from '../../assets/images/library-empty-mascot.png';
import SafeImage from '../../features/story/components/SafeImage';
import { setCoverFrameRatio } from '../../features/story/coverLayout';
import bookCoverStyles from '../../features/story/components/BookCover.module.css';
import { getHome } from '../../services/homeApi';
import { getStories } from '../../services/libraryApi';
import { retryStory } from '../../services/storiesApi';
import { GENERATING_STATUSES, libraryGroup } from '../../features/story/storyMappers';
import { useStoryGeneration } from '../../features/story/generation/useStoryGeneration';
import { useSignedIn } from '../../features/auth/useSignedIn';
import styles from './LibraryPage.module.css';

const filters = [
  { value: 'ALL', label: '전체' },
  { value: 'CREATING', label: '제작 중', countKey: 'creating' },
  { value: 'REVIEWING', label: '확인을 기다려요', countKey: 'reviewing' },
  { value: 'UNREAD', label: '아직 읽지 않았어요', countKey: 'unread' },
  { value: 'READ', label: '함께 읽었어요', countKey: 'read' },
  { value: 'FAILED', label: '만들지 못했어요', countKey: 'failed' },
];

const groupLabels = {
  CREATING: '제작 중', REVIEWING: '확인을 기다려요',
  UNREAD: '아직 읽지 않았어요', READ: '함께 읽었어요', FAILED: '만들지 못했어요',
};

const groupClasses = {
  CREATING: 'creating', REVIEWING: 'reviewing', UNREAD: 'unread', READ: 'read', FAILED: 'failed',
};

function formatStoryDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' }).format(date);
}

// 만들다 멈춘(임시저장) 동화예요. 서재에는 실제로 만들고 있는 동화부터 보여줘서 이 동화들은 빼요.
// 서버는 '전체'와 '제작 중'에 이 동화들도 함께 보내서, 목록과 탭 숫자에서 화면이 직접 빼요.
const DRAFT_STATUSES = ['DRAFT', 'INTERVIEWING', 'CONFIRMING'];
const isDraft = (story) => DRAFT_STATUSES.includes(String(story.status ?? '').toUpperCase());
const PAGE_SIZE = 20;
const DRAFT_COUNT_PAGE_SIZE = 50;
const DRAFT_COUNT_MAX_PAGES = 20;

// 임시저장 동화를 빼고, 보여줄 동화가 하나라도 나올 때까지 다음 쪽을 이어서 불러와요.
async function loadVisibleStories(filter, startPage) {
  let pageNo = startPage;
  let items = [];
  let result;
  do {
    result = await getStories({ filter, page: pageNo, size: PAGE_SIZE });
    items = items.concat((result.items || []).filter((story) => !isDraft(story)));
    pageNo = (result.page ?? pageNo) + 1;
  } while (items.length === 0 && result.hasNext);
  return { items, page: pageNo - 1, hasNext: Boolean(result.hasNext), totalElements: result.totalElements };
}

// 탭 숫자에서 뺄 임시저장 동화 수예요.
async function countDrafts() {
  let pageNo = 0;
  let count = 0;
  let result;
  do {
    result = await getStories({ filter: 'CREATING', page: pageNo, size: DRAFT_COUNT_PAGE_SIZE });
    count += (result.items || []).filter(isDraft).length;
    pageNo += 1;
  } while (result.hasNext && pageNo < DRAFT_COUNT_MAX_PAGES);
  return count;
}

function LibraryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isSignedIn = useSignedIn();
  const guest = isSignedIn === false;
  // 미리보기에서 '이대로 확정'으로 넘어오면 '서재에 저장했어요' 팝업을 보여줘요.
  const [savedStory] = useState(() => (location.state?.newlyCreated ? (location.state.story ?? {}) : null));
  const [savedModalOpen, setSavedModalOpen] = useState(savedStory !== null);
  const [activeFilter, setActiveFilter] = useState(() => {
    const requestedFilter = new URLSearchParams(location.search).get('filter');
    return filters.some((filter) => filter.value === requestedFilter) ? requestedFilter : 'ALL';
  });
  const [stories, setStories] = useState([]);
  const [counts, setCounts] = useState({});
  const [draftCount, setDraftCount] = useState(0);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const { resumeGeneration } = useStoryGeneration();

  // Keep the selected tab in sync when a notification changes only the query string.
  useEffect(() => {
    const requestedFilter = new URLSearchParams(location.search).get('filter');
    if (filters.some((filter) => filter.value === requestedFilter)) {
      setActiveFilter(requestedFilter);
      setIsLoading(true);
      setError('');
    }
  }, [location.search]);

  // 새로고침했을 때 만드는 중인 동화가 있으면 다시 따라가서, 끝나면 알림이 오게 해요.
  useEffect(() => {
    if (isSignedIn) resumeGeneration();
  }, [isSignedIn, resumeGeneration]);

  useEffect(() => {
    if (!isSignedIn) return;
    getHome().then((home) => {
      if (home?.counts) setCounts((previous) => ({ ...previous, ...home.counts }));
    }).catch(() => {
      // The list is still usable when tab counts are unavailable.
    });
    countDrafts().then(setDraftCount).catch(() => {
      // 못 세면 서버 숫자를 그대로 보여줘요.
    });
  }, [isSignedIn]);

  useEffect(() => {
    if (!isSignedIn) return undefined;
    let active = true;

    loadVisibleStories(activeFilter, 0).then((result) => {
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
  }, [activeFilter, isSignedIn]);

  const closeSavedModal = () => {
    setSavedModalOpen(false);
    navigate(location.pathname, { replace: true, state: null });
  };

  const readSavedStory = () => {
    navigate(`/library/${savedStory.id}`, { state: { story: savedStory, startReading: true } });
  };

  // 동화 상태에 따라 열리는 화면이 달라요.
  // 확인을 기다려요 → 미리보기, 읽을 수 있는 동화 → 동화 상세, 만들고 있는 동화 → 진행 보기
  const openStory = (story) => {
    const state = { story };
    const group = libraryGroup(story);

    if (group === 'REVIEWING') navigate(`/story/${story.id}/preview`, { state });
    else if (group === 'UNREAD' || group === 'READ') navigate(`/library/${story.id}`, { state });
    else if (GENERATING_STATUSES.includes(story.status)) navigate('/story/new', { state: { generation: { storyId: story.id } } });
  };

  // 만들지 못한 동화는 같은 범위로 다시 만들어요. (다시 만들기 횟수에 넣지 않아요)
  const handleRetry = async (story) => {
    setError('');
    try {
      await retryStory(story.id);
      navigate('/story/new', { state: { generation: { storyId: story.id } } });
    } catch (requestError) {
      setError(requestError.message || '다시 시도하지 못했어요.');
    }
  };

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    setError('');
    try {
      const result = await loadVisibleStories(activeFilter, page + 1);
      setStories((current) => [...current, ...(result.items || [])]);
      setPage(result.page ?? page + 1);
      setHasNext(Boolean(result.hasNext));
    } catch (requestError) {
      setError(requestError.message || '동화를 더 불러오지 못했어요.');
    } finally {
      setIsLoadingMore(false);
    }
  };

  // 로그인했어도 보여줄 동화가 없으면 비로그인과 같은 빈 서재 화면을 보여줘요. (로그인 버튼만 없어요)
  // 전체 보기에서 비었으면 '아직 제작된 동화가 없어요', 카테고리(상태) 필터에서 비었으면 '조건에 해당하는 동화가 없어요'예요.
  // 서버 숫자에는 임시저장 동화가 들어 있어서 '전체'와 '제작 중'에서 빼요.
  const withoutDrafts = (value) => (value == null ? value : Math.max(0, value - draftCount));
  const shownCounts = { ...counts, all: withoutDrafts(counts.all), creating: withoutDrafts(counts.creating) };

  const isLibraryEmpty = isSignedIn && !isLoading && !error && stories.length === 0;
  const showEmptyScreen = guest || isLibraryEmpty;
  const emptyTitle = guest || activeFilter === 'ALL' ? '아직 제작된 동화가 없어요' : '조건에 해당하는 동화가 없어요';

  if (isSignedIn === null) {
    return <div className={styles.page} role="status" aria-label="서재를 불러오는 중" />;
  }

  return (
    <>
      <div className={styles.page} inert={isSignedIn && savedModalOpen}>
        <Sidebar guest={guest} />

        <div className={`${styles.main} ${guest ? styles.guestMain : ''}`}>
          <div className={styles.topbar}>
            {guest ? (
              <Link className={styles.loginLink} to="/auth">로그인</Link>
            ) : <><NotificationBell />
            <button
              className={styles.avatarButton}
              type="button"
              onClick={() => navigate('/mypage')}
              aria-label="마이페이지"
            >
              <img className={styles.avatarCircle} src={avatarCircle} alt="" />
              <img className={styles.avatarPerson} src={avatarPerson} alt="" />
            </button></>}
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
                  onClick={() => {
                    setActiveFilter(filter.value);
                    if (!guest) {
                      setIsLoading(true);
                      setError('');
                    }
                  }}
                >
                  {filter.label}{shownCounts[filter.countKey || 'all'] != null && ` ${shownCounts[filter.countKey || 'all']}`}
                </button>
              ))}
            </div>

            {showEmptyScreen && (
              // 보여줄 동화가 없을 때의 안내예요. 로그인하지 않았으면 로그인으로 이어 주는 버튼이 함께 나와요.
              <section className={styles.guestEmpty} aria-labelledby="library-empty-title">
                <div className={styles.emptyMascot}>
                  <img src={emptyMascot} alt="" />
                </div>
                <p className={styles.emptyTitle} id="library-empty-title">{emptyTitle}</p>
                {guest && <Link className={styles.emptyLogin} to="/auth">로그인하고 동화 만들기</Link>}
              </section>
            )}

            {!guest && error && <p className={styles.error} role="alert"><ErrorText message={error} /></p>}
            {!guest && !isLibraryEmpty && (
            <section className={styles.storyGrid} aria-live="polite" aria-busy={isLoading}>
              {isLoading ? <p className={styles.message}>서재를 불러오는 중이에요.</p> : stories.map((story) => {
                const group = libraryGroup(story);
                const storyTitle = story.title || '제목을 준비하고 있어요';
                const meta = [story.categoryLabel, story.childDisplayName, formatStoryDate(story.updatedAt || story.createdAt)]
                  .filter(Boolean).join(' · ');
                return (
                  <article className={styles.storyCard} key={story.id}>
                    <span className={`${styles.badge} ${styles[groupClasses[group]] || ''}`}>
                      {story.label || groupLabels[group] || '동화'}
                    </span>
                    <div
                      className={`${styles.coverFrame} ${bookCoverStyles.bookCover}`}
                      data-cover-frame
                      style={{ '--cover': `url(${JSON.stringify(story.coverUrl || bookCover)})` }}
                    >
                      <div className={bookCoverStyles.bookFace}>
                        <div className={bookCoverStyles.bookArt}>
                          <SafeImage
                            className={styles.cover}
                            onLoad={setCoverFrameRatio}
                            src={story.coverUrl}
                            alt={story.title ? `${story.title} 표지` : '동화 표지'}
                            fallback={<img className={styles.cover} src={bookCover} alt={story.title ? `${story.title} 표지` : '동화 표지'} />}
                          />
                        </div>
                      </div>
                    </div>
                    <h2 className={styles.storyTitle}>
                      {group !== 'FAILED' ? (
                        <button className={styles.storyOpen} type="button" onClick={() => openStory(story)}>
                          {storyTitle}
                        </button>
                      ) : storyTitle}
                    </h2>
                    <div className={styles.storyFooter}>
                      <p className={styles.storyMeta}>{meta}</p>
                      {group === 'FAILED' && (
                        <button className={styles.retryButton} type="button" onClick={() => handleRetry(story)}>
                          다시 만들기
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
            )}
            {!guest && hasNext && !isLoading && (
              <button className={styles.loadMore} type="button" onClick={handleLoadMore} disabled={isLoadingMore}>
                {isLoadingMore ? '불러오는 중…' : '더 보기'}
              </button>
            )}
          </main>
        </div>
      </div>
      {isSignedIn && savedModalOpen && <StorySavedModal onClose={closeSavedModal} onRead={readSavedStory} />}
    </>
  );
}

export default LibraryPage;
