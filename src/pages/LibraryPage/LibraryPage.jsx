import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ErrorText from '../../components/ui/ErrorText';
import Sidebar from '../../components/layout/Sidebar';
import NotificationBell from '../../components/layout/NotificationBell';
import StorySavedModal from '../../features/library/components/StorySavedModal';
import avatarCircle from '../../assets/icons/avatar-circle.svg';
import avatarPerson from '../../assets/icons/avatar-person.svg';
import bookCover from '../../assets/images/library-cover-sample.png';
import creatingCover from '../../assets/images/library-creating-cover.svg';
import failedCover from '../../assets/images/library-failed-cover.svg';
import emptyMascot from '../../assets/images/library-empty-mascot.png';
import SafeImage from '../../features/story/components/SafeImage';
import { setCoverFrameRatio } from '../../features/story/coverLayout';
import bookCoverStyles from '../../features/story/components/BookCover.module.css';
import { getStories } from '../../services/libraryApi';
import { retryStory } from '../../services/storiesApi';
import { GENERATING_STATUSES, LIBRARY_TOPICS, libraryGroup, libraryTopic } from '../../features/story/storyMappers';
import { useStoryGeneration } from '../../features/story/generation/useStoryGeneration';
import { useSignedIn } from '../../features/auth/useSignedIn';
import styles from './LibraryPage.module.css';

// 서재 칩은 주제별로 나눠요. (동화 책 위의 상태 표시는 그대로예요)
const ALL_FILTER = 'ALL';
const filters = [{ value: ALL_FILTER, label: '전체' }, ...LIBRARY_TOPICS.map((topic) => ({ value: topic, label: topic }))];
const isTopicFilter = (value) => filters.some((filter) => filter.value === value);
// 주소의 filter가 주제가 아니면(알림에서 넘어온 상태 이름 등) 전체를 보여줘요.
const filterFromSearch = (search) => {
  const requested = new URLSearchParams(search).get('filter');
  if (requested == null) return null;
  return isTopicFilter(requested) ? requested : ALL_FILTER;
};

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
// 서버는 '전체'에 이 동화들도 함께 보내서, 목록과 칩 숫자에서 화면이 직접 빼요.
const DRAFT_STATUSES = ['DRAFT', 'INTERVIEWING', 'CONFIRMING'];
const isDraft = (story) => DRAFT_STATUSES.includes(String(story.status ?? '').toUpperCase());
// 서버는 주제로 거르지 못해서, 서재 전체를 받아 화면에서 주제별로 나눠요. (50개씩, 최대 1,000개)
const LOAD_PAGE_SIZE = 50;
const LOAD_MAX_PAGES = 20;
// 한 번에 보여주는 동화 수예요. '더 보기'를 누르면 이만큼 더 보여줘요.
const SHOW_STEP = 20;

async function loadLibrary() {
  let pageNo = 0;
  let items = [];
  let result;
  do {
    result = await getStories({ filter: 'ALL', page: pageNo, size: LOAD_PAGE_SIZE });
    items = items.concat((result.items || []).filter((story) => !isDraft(story)));
    pageNo += 1;
  } while (result.hasNext && pageNo < LOAD_MAX_PAGES);
  return items;
}

function LibraryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isSignedIn = useSignedIn();
  const guest = isSignedIn === false;
  // 미리보기에서 '이대로 확정'으로 넘어오면 '서재에 저장했어요' 팝업을 보여줘요.
  const [savedStory] = useState(() => (location.state?.newlyCreated ? (location.state.story ?? {}) : null));
  const [savedModalOpen, setSavedModalOpen] = useState(savedStory !== null);
  const [activeFilter, setActiveFilter] = useState(() => filterFromSearch(location.search) ?? ALL_FILTER);
  const [library, setLibrary] = useState([]);
  const [shownCount, setShownCount] = useState(SHOW_STEP);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { resumeGeneration } = useStoryGeneration();

  // 알림을 눌러 주소의 filter만 바뀌어도 칩을 맞춰요. (그리는 중에 주소가 바뀐 것을 보고 바로 맞춰요)
  const [seenSearch, setSeenSearch] = useState(location.search);
  if (seenSearch !== location.search) {
    setSeenSearch(location.search);
    const requested = filterFromSearch(location.search);
    if (requested) {
      setActiveFilter(requested);
      setShownCount(SHOW_STEP);
    }
  }

  // 새로고침했을 때 만드는 중인 동화가 있으면 다시 따라가서, 끝나면 알림이 오게 해요.
  useEffect(() => {
    if (isSignedIn) resumeGeneration();
  }, [isSignedIn, resumeGeneration]);

  useEffect(() => {
    if (!isSignedIn) return undefined;
    let active = true;

    loadLibrary().then((items) => {
      if (!active) return;
      setLibrary(items);
      setError('');
      setIsLoading(false);
    }).catch((requestError) => {
      if (!active) return;
      setLibrary([]);
      setError(requestError.message || '서재 목록을 불러오지 못했어요.');
      setIsLoading(false);
    });

    return () => { active = false; };
  }, [isSignedIn]);

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

  // 칩 숫자와 지금 칩의 동화예요. 모두 받아 둔 서재에서 화면이 직접 나눠요.
  const topicCounts = library.reduce((result, story) => {
    const topic = libraryTopic(story);
    return { ...result, [topic]: (result[topic] ?? 0) + 1 };
  }, { [ALL_FILTER]: library.length });
  const filtered = activeFilter === ALL_FILTER ? library : library.filter((story) => libraryTopic(story) === activeFilter);
  const stories = filtered.slice(0, shownCount);
  const hasNext = filtered.length > stories.length;

  // 로그인했어도 보여줄 동화가 없으면 비로그인과 같은 빈 서재 화면을 보여줘요. (로그인 버튼만 없어요)
  // 전체 보기에서 비었으면 '아직 제작된 동화가 없어요', 주제 칩에서 비었으면 '조건에 해당하는 동화가 없어요'예요.

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

            <div className={styles.filters} aria-label="동화 주제 필터">
              {filters.map((filter) => (
                <button
                  key={filter.value}
                  className={`${styles.filter} ${activeFilter === filter.value ? styles.filterActive : ''}`}
                  type="button"
                  aria-pressed={activeFilter === filter.value}
                  onClick={() => {
                    setActiveFilter(filter.value);
                    setShownCount(SHOW_STEP);
                  }}
                >
                  {filter.label}{isSignedIn && !isLoading && !error && ` ${topicCounts[filter.value] ?? 0}`}
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
                // 제작 중이거나 만들지 못한 동화는 표지가 없어서, 상태에 맞는 회색 표지를 보여줘요.
                //  - 제작 중: 연필이 그림을 그리는 중이에요. (빛이 지나가요)
                //  - 만들지 못했어요: 연필이 부러졌고, 그리던 선이 엉켜 있어요.
                const creating = group === 'CREATING';
                const stateCover = creating ? creatingCover : group === 'FAILED' ? failedCover : null;
                const coverAlt = story.title ? `${story.title} 표지` : '동화 표지';
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
                      style={{ '--cover': `url(${JSON.stringify(stateCover || story.coverUrl || bookCover)})` }}
                    >
                      <div className={bookCoverStyles.bookFace}>
                        <div className={`${bookCoverStyles.bookArt} ${creating ? styles.creatingArt : ''}`}>
                          {stateCover ? (
                            <img className={styles.cover} src={stateCover} alt={creating ? '제작 중인 동화 표지' : '만들지 못한 동화 표지'} />
                          ) : (
                            <SafeImage
                              className={styles.cover}
                              onLoad={setCoverFrameRatio}
                              src={story.coverUrl}
                              alt={coverAlt}
                              fallback={<img className={styles.cover} src={bookCover} alt={coverAlt} />}
                            />
                          )}
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
              <button className={styles.loadMore} type="button" onClick={() => setShownCount((count) => count + SHOW_STEP)}>
                더 보기
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
