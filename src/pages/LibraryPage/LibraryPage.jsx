import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ErrorText from '../../components/ui/ErrorText';
import Sidebar from '../../components/layout/Sidebar';
import NotificationBell from '../../components/layout/NotificationBell';
import StorySavedModal from '../../features/library/components/StorySavedModal';
import shelfBackground from '../../assets/images/library/shelf-background.webp';
import shelfBoard from '../../assets/images/library/shelf-board.svg';
import shelfFront from '../../assets/images/library/shelf-front.webp';
import creatingBook from '../../assets/images/library/creating-book.webp';
import creatingMascot from '../../assets/images/library/creating-mascot.webp';
import libraryBell from '../../assets/images/library/notification.svg';
import libraryProfile from '../../assets/images/library/profile.svg';
import bookCover from '../../assets/images/library-cover-sample.png';
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

// 서재 칩은 주제별로 나눠요. (처음 / 친구 / 가족 / 교육·훈육 / 이별 / 기타)
const ALL_FILTER = 'ALL';
const filters = [{ value: ALL_FILTER, label: '전체' }, ...LIBRARY_TOPICS.map((topic) => ({ value: topic, label: topic }))];
const isTopicFilter = (value) => filters.some((filter) => filter.value === value);
// 주소의 filter가 주제가 아니면(알림에서 넘어온 상태 이름 등) 전체를 보여줘요.
const filterFromSearch = (search) => {
  const requested = new URLSearchParams(search).get('filter');
  if (requested == null) return null;
  return isTopicFilter(requested) ? requested : ALL_FILTER;
};

// 책 위 상태는 글 대신 모양으로 보여줘요. 화면 읽기 프로그램에는 글로 알려줘요.
const groupLabels = {
  CREATING: '제작 중', REVIEWING: '확인을 기다려요',
  UNREAD: '아직 읽지 않았어요', READ: '함께 읽었어요', FAILED: '만들지 못했어요',
};

// 만들다 멈춘(임시저장) 동화예요. 서재에는 실제로 만들고 있는 동화부터 보여줘서 이 동화들은 빼요.
const DRAFT_STATUSES = ['DRAFT', 'INTERVIEWING', 'CONFIRMING'];
const isDraft = (story) => DRAFT_STATUSES.includes(String(story.status ?? '').toUpperCase());
// 서버는 주제로 거르지 못해서, 서재 전체를 받아 화면에서 주제별로 나눠요. (50개씩, 최대 1,000개)
const LOAD_PAGE_SIZE = 50;
const LOAD_MAX_PAGES = 20;
// 한 번에 보여주는 책장 수예요. '더 보기'를 누르면 이만큼 더 보여줘요.
const SHOW_SHELVES = 5;

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

// 책장 한 칸에 꽂는 책 수예요. 데스크톱은 디자인대로 4권, 좁은 화면은 3권·2권이에요.
const SHELF_QUERIES = [['(max-width: 560px)', 2], ['(max-width: 900px)', 3]];
const booksPerShelf = () => SHELF_QUERIES.find(([query]) => window.matchMedia(query).matches)?.[1] ?? 4;

function useBooksPerShelf() {
  const [count, setCount] = useState(booksPerShelf);
  useEffect(() => {
    const lists = SHELF_QUERIES.map(([query]) => window.matchMedia(query));
    const update = () => setCount(booksPerShelf());
    lists.forEach((list) => list.addEventListener('change', update));
    return () => lists.forEach((list) => list.removeEventListener('change', update));
  }, []);
  return count;
}

const chunk = (items, size) => Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, index * size + size));

// 책장 한 칸이에요. 위판 → 책 → 앞판 순서로 겹쳐서, 책 아래가 앞판에 살짝 가려 꽂힌 것처럼 보여요.
function Shelf({ children }) {
  return (
    <div className={styles.shelf}>
      <img className={styles.shelfBoard} src={shelfBoard} alt="" />
      <div className={styles.shelfBooks}>{children}</div>
      <img className={styles.shelfFront} src={shelfFront} alt="" />
    </div>
  );
}

// 책장에 꽂힌 동화 한 권이에요. 상태마다 표지 모양이 달라요.
//  - 제작 중: 회색 책에 흐린 캐릭터와 '제작중...'
//  - 확인을 기다려요: 테두리가 반짝반짝 빛나요
//  - 아직 읽지 않았어요: 테두리에 빨간 NEW
//  - 함께 읽었어요: 기본 표지
//  - 만들지 못했어요: 부러진 연필 표지와 '다시 만들기'
function ShelfBook({ story, onOpen, onRetry }) {
  const group = libraryGroup(story);
  const title = story.title || '제목을 준비하고 있어요';
  const label = `${title}, ${groupLabels[group] ?? '동화'}`;

  if (group === 'CREATING') {
    return (
      <button className={`${styles.book} ${styles.creatingBook}`} type="button" onClick={() => onOpen(story)} aria-label={label} title={title}>
        <img className={styles.creatingShape} src={creatingBook} alt="" />
        <img className={styles.creatingMascot} src={creatingMascot} alt="" />
        <span className={styles.creatingText} aria-hidden="true">제작중...</span>
      </button>
    );
  }

  const failed = group === 'FAILED';
  const cover = (
    <span className={`${styles.cover} ${bookCoverStyles.bookCover}`} data-cover-frame
      style={{ '--cover': `url(${JSON.stringify(failed ? failedCover : (story.coverUrl || bookCover))})` }}>
      <span className={bookCoverStyles.bookFace}>
        <span className={bookCoverStyles.bookArt}>
          {failed ? <img className={styles.coverImage} src={failedCover} alt="" /> : (
            <SafeImage className={styles.coverImage} onLoad={setCoverFrameRatio} src={story.coverUrl} alt=""
              fallback={<img className={styles.coverImage} src={bookCover} alt="" />} />
          )}
        </span>
      </span>
    </span>
  );

  if (failed) {
    return (
      <div className={`${styles.book} ${styles.failedBook}`} role="group" aria-label={label} title={title}>
        {cover}
        <button className={styles.retryButton} type="button" onClick={() => onRetry(story)}>다시 만들기</button>
      </div>
    );
  }

  return (
    <button className={styles.book} type="button" data-state={group} onClick={() => onOpen(story)} aria-label={label} title={title}>
      {cover}
      {group === 'REVIEWING' && (
        <span className={styles.sparkles} aria-hidden="true"><i /><i /><i /></span>
      )}
      {group === 'UNREAD' && <span className={styles.newBadge} aria-hidden="true">NEW</span>}
    </button>
  );
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
  const [shownShelves, setShownShelves] = useState(SHOW_SHELVES);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { resumeGeneration } = useStoryGeneration();
  const perShelf = useBooksPerShelf();

  // 알림을 눌러 주소의 filter만 바뀌어도 칩을 맞춰요. (그리는 중에 주소가 바뀐 것을 보고 바로 맞춰요)
  const [seenSearch, setSeenSearch] = useState(location.search);
  if (seenSearch !== location.search) {
    setSeenSearch(location.search);
    const requested = filterFromSearch(location.search);
    if (requested) {
      setActiveFilter(requested);
      setShownShelves(SHOW_SHELVES);
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

  const filtered = activeFilter === ALL_FILTER ? library : library.filter((story) => libraryTopic(story) === activeFilter);
  const shelves = chunk(filtered, perShelf);
  const shownStoryShelves = shelves.slice(0, shownShelves);
  const hasNext = shelves.length > shownStoryShelves.length;

  // 보여줄 동화가 없으면 빈 책장 위에 안내를 보여줘요. 로그인하지 않았으면 로그인으로 이어 주는 버튼이 함께 나와요.
  // 전체에서 비었으면 '아직 제작된 동화가 없어요', 주제 칩에서 비었으면 '조건에 해당하는 동화가 없어요'예요.
  const isLibraryEmpty = isSignedIn && !isLoading && !error && filtered.length === 0;
  const showEmptyScreen = guest || isLibraryEmpty;
  const emptyTitle = guest || activeFilter === ALL_FILTER ? '아직 제작된 동화가 없어요' : '조건에 해당하는 동화가 없어요';

  if (isSignedIn === null) {
    return <div className={styles.page} role="status" aria-label="서재를 불러오는 중" />;
  }

  return (
    <>
      <div className={styles.page} inert={isSignedIn && savedModalOpen}>
        <img className={styles.background} src={shelfBackground} alt="" />
        <div className={styles.sidebarLayer}>
          <Sidebar guest={guest} compact />
        </div>

        <div className={styles.topbar}>
          {guest ? (
            <Link className={styles.loginLink} to="/auth">로그인</Link>
          ) : <><NotificationBell iconSrc={libraryBell} />
          <button
            className={styles.avatarButton}
            type="button"
            onClick={() => navigate('/mypage')}
            aria-label="마이페이지"
          >
            <img className={styles.avatar} src={libraryProfile} alt="" />
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
                  setShownShelves(SHOW_SHELVES);
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {!guest && error && <p className={styles.error} role="alert"><ErrorText message={error} /></p>}

          <section className={styles.shelves} aria-live="polite" aria-busy={!guest && isLoading} aria-label="내 동화 책장">
            {showEmptyScreen || (!guest && isLoading) ? (
              // 빈 서재는 빈 책장 위에 캐릭터와 안내를 올려 둬요.
              <Shelf>
                {showEmptyScreen ? (
                  <div className={styles.empty}>
                    <img className={styles.emptyMascot} src={emptyMascot} alt="" />
                    <p className={styles.emptyTitle}>{emptyTitle}</p>
                    {guest && <Link className={styles.emptyLogin} to="/auth">로그인하고 동화 만들기</Link>}
                  </div>
                ) : <p className={`${styles.empty} ${styles.message}`}>서재를 불러오는 중이에요.</p>}
              </Shelf>
            ) : shownStoryShelves.map((row) => (
              <Shelf key={row.map((story) => story.id).join('-')}>
                {row.map((story) => (
                  <ShelfBook key={story.id} story={story} onOpen={openStory} onRetry={handleRetry} />
                ))}
              </Shelf>
            ))}
          </section>

          {!guest && hasNext && !isLoading && (
            <button className={styles.loadMore} type="button" onClick={() => setShownShelves((count) => count + SHOW_SHELVES)}>
              더 보기
            </button>
          )}
        </main>
      </div>
      {isSignedIn && savedModalOpen && <StorySavedModal onClose={closeSavedModal} onRead={readSavedStory} />}
    </>
  );
}

export default LibraryPage;
