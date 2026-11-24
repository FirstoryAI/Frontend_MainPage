import { useEffect, useLayoutEffect, useState } from 'react';
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
import emptyMascot from '../../assets/images/library-empty-mascot.webp';
import SafeImage from '../../features/story/components/SafeImage';
import { setCoverFrameRatio } from '../../features/story/coverLayout';
import bookCoverStyles from '../../features/story/components/BookCover.module.css';
import { getStories } from '../../services/libraryApi';
import { retryStory } from '../../services/storiesApi';
import { GENERATING_STATUSES, LIBRARY_TOPICS, libraryGroup, libraryTopic } from '../../features/story/storyMappers';
import { useStoryGeneration } from '../../features/story/generation/useStoryGeneration';
import { useSignedIn } from '../../features/auth/useSignedIn';
import { isNarrationEnabled, unlockNarration } from '../../features/story/narration';
import styles from './LibraryPage.module.css';

// 서재 칩은 주제별로 나눠요. (첫 경험 / 친구 / 가족 / 교육·훈육 / 이별 / 기타)
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

// ---------- 화면에 맞추기 (스크롤 없이 한 화면) ----------
// 디자인(1440×960) 기준 값이에요. 책 한 권 244px(표지 200px), 책장 한 칸 높이 262px, 칸 사이 57px.
const DESIGN_WIDTH = 1440;
const DESIGN_HEIGHT = 960;
const BOOK = 244;
// 서재에는 책장이 늘 2칸 있어요. 책이 적어도 빈 칸을 그대로 보여주고, 넘치는 책은 쪽을 넘겨서 봐요.
const SHELVES_PER_PAGE = 2;
// 데스크톱 책장 왼쪽(230px)·오른쪽 여백(99px)이에요. 책 한 권이 늘 때마다 책장이 280px(표지 200 + 사이 80)씩 길어져요.
const DESKTOP_SHELF_LEFT = 230;
const DESKTOP_SHELF_RIGHT = 99;
const BOOK_PITCH = 280;
// '서재' 제목 윗변(디자인 135px)이에요. 본문을 줄여도 로고(아래 끝 114px) 밑으로 16px은 띄워요.
const DESKTOP_TITLE_TOP = 135;
const LOGO_CLEAR = 114 + 16;

// 화면 크기에 맞춰 책장 모양을 정해요.
//  - 900px 넘는 화면(데스크톱·패드): 디자인을 통째로 비율대로 줄여서(zoom) 가로·세로 모두 한 화면에 넣어요.
//    한 칸에 4권이 기본이고, 화면이 디자인보다 넓으면 남는 폭만큼 한 칸에 책을 더 꽂아요.
//  - 900px 이하: 화면 폭에 맞춰 책 크기를 정해요(3권, 560px 이하 2권).
// 책장은 어느 화면에서나 2칸이고, 넘치는 책은 스크롤 대신 쪽을 넘겨서 봐요.
function measureShelfLayout() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  if (width > 900) {
    const scale = Math.min(1, width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
    // 로고는 줄지 않아서, 본문이 줄어 제목이 로고에 붙을 만큼 올라가면 그만큼 아래로 내려요.
    const titleTop = Math.max(DESKTOP_TITLE_TOP, LOGO_CLEAR / scale);
    // 책장 폭 = 책 수 × 280 - 8 (4권이면 디자인 그대로 1112px)
    const shelfRoom = width / scale - DESKTOP_SHELF_LEFT - DESKTOP_SHELF_RIGHT;
    const perShelf = Math.max(4, Math.floor((shelfRoom + 8) / BOOK_PITCH));
    return { perShelf, scale, book: BOOK, titleTop };
  }
  const perShelf = width <= 560 ? 2 : 3;
  // 표지 n권(200/244씩) + 사이 (n-1)칸(80/244씩) + 양옆 36/244씩. book은 책장 칸 높이(디자인 244) 기준이에요.
  const book = Math.min(BOOK, ((width - 32) * BOOK) / (perShelf * 200 + (perShelf - 1) * 80 + 72));
  return { perShelf, scale: 1, book, titleTop: null };
}

function useShelfLayout() {
  const [layout, setLayout] = useState(measureShelfLayout);
  useLayoutEffect(() => {
    const update = () => {
      const next = measureShelfLayout();
      setLayout((current) => (
        current.perShelf === next.perShelf
          && current.scale === next.scale && current.book === next.book && current.titleTop === next.titleTop ? current : next));
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);
  return layout;
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
          {failed ? <img className={`${styles.coverImage} ${styles.coverImageLoaded}`} src={failedCover} alt="" /> : (
            <SafeImage className={styles.coverImage} onLoad={(event) => {
              setCoverFrameRatio(event);
              event.currentTarget.classList.add(styles.coverImageLoaded);
            }} src={story.coverUrl} alt=""
              fallback={<img className={`${styles.coverImage} ${styles.coverImageLoaded}`} src={bookCover} alt="" />} />
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
        <>
          <span className={styles.shine} aria-hidden="true" />
          <span className={styles.sparkles} aria-hidden="true"><i /><i /><i /></span>
        </>
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
  const [pageIndex, setPageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { resumeGeneration } = useStoryGeneration();
  const { perShelf, scale, book, titleTop } = useShelfLayout();

  // 알림을 눌러 주소의 filter만 바뀌어도 칩을 맞춰요. (그리는 중에 주소가 바뀐 것을 보고 바로 맞춰요)
  const [seenSearch, setSeenSearch] = useState(location.search);
  if (seenSearch !== location.search) {
    setSeenSearch(location.search);
    const requested = filterFromSearch(location.search);
    if (requested) {
      setActiveFilter(requested);
      setPageIndex(0);
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
    // 바로 읽기는 다음 화면에서 시작돼서, 누른 지금 소리를 열어 둬야 첫 쪽부터 읽어 줄 수 있어요. (아이패드·아이폰)
    if (isNarrationEnabled()) unlockNarration();
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
  // 책장 2칸씩 쪽으로 나눠요. 화면 크기가 바뀌어 쪽 수가 줄면 마지막 쪽을 보여줘요.
  const pageCount = Math.max(1, Math.ceil(shelves.length / SHELVES_PER_PAGE));
  const page = Math.min(pageIndex, pageCount - 1);
  // 책이 모자라도 책장은 늘 2칸이라, 모자란 칸은 빈 책장으로 채워요.
  const shownStoryShelves = Array.from({ length: SHELVES_PER_PAGE }, (_, index) => shelves[page * SHELVES_PER_PAGE + index] ?? []);

  // 보여줄 동화가 없으면 빈 책장 위에 안내를 보여줘요. 로그인하지 않았으면 로그인으로 이어 주는 버튼이 함께 나와요.
  // 전체에서 비었으면 '아직 제작된 동화가 없어요', 주제 칩에서 비었으면 '상황에 해당하는 동화가 없어요'예요.
  const isLibraryEmpty = isSignedIn && !isLoading && !error && filtered.length === 0;
  const showEmptyScreen = guest || isLibraryEmpty;
  const emptyTitle = guest || activeFilter === ALL_FILTER ? '아직 제작된 동화가 없어요' : '상황에 해당하는 동화가 없어요';

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

        <main
          className={styles.content}
          style={{
            zoom: scale,
            '--book': `${book}px`,
            '--per-shelf': perShelf,
            '--desktop-chip-height': `${38 / scale}px`,
            '--desktop-chip-font': `${15 / scale}px`,
            '--desktop-chip-pad-x': `${18 / scale}px`,
            '--desktop-chip-gap': `${18 / scale}px`,
            '--desktop-chip-radius': `${19 / scale}px`,
            ...(titleTop ? { paddingTop: titleTop } : {}),
          }}
        >
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
                  setPageIndex(0);
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {!guest && error && <p className={styles.error} role="alert"><ErrorText message={error} /></p>}

          <section className={`${styles.shelves} ${!guest && !isLoading && !error ? styles.shelvesReady : ''}`}
            aria-live="polite" aria-busy={!guest && isLoading} aria-label="내 동화 책장">
            {showEmptyScreen ? (
              // 빈 서재는 책장 없이, 예전 서재와 같은 크기의 캐릭터·안내·로그인 버튼만 보여줘요.
              <div className={styles.empty}>
                <div className={styles.emptyMascot}>
                  <img src={emptyMascot} alt="" />
                </div>
                <p className={styles.emptyTitle}>{emptyTitle}</p>
                {guest && <Link className={styles.emptyLogin} to="/auth">로그인하고 동화 만들기</Link>}
              </div>
            ) : !guest && isLoading ? (
              Array.from({ length: SHELVES_PER_PAGE }, (_, index) => (
                <Shelf key={index}>
                  {index === 0 && <p className={`${styles.loading} ${styles.message}`}>서재를 불러오는 중이에요.</p>}
                </Shelf>
              ))
            ) : shownStoryShelves.map((row, index) => (
              <Shelf key={`${page}-${index}`}>
                {row.map((story) => (
                  <ShelfBook key={story.id} story={story} onOpen={openStory} onRetry={handleRetry} />
                ))}
              </Shelf>
            ))}
          </section>

          {!guest && !isLoading && pageCount > 1 && (
            <nav className={styles.pager} aria-label="책장 쪽">
              <button type="button" onClick={() => setPageIndex(page - 1)} disabled={page === 0} aria-label="이전 책장">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
              </button>
              <span><strong>{page + 1}</strong> / {pageCount}</span>
              <button type="button" onClick={() => setPageIndex(page + 1)} disabled={page === pageCount - 1} aria-label="다음 책장">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
              </button>
            </nav>
          )}
        </main>
      </div>
      {isSignedIn && savedModalOpen && <StorySavedModal onClose={closeSavedModal} onRead={readSavedStory} />}
    </>
  );
}

export default LibraryPage;
