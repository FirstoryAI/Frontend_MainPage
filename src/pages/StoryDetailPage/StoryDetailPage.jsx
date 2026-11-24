import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { transitionScene } from '../../app/transitionScene';
import Sidebar from '../../components/layout/Sidebar';
import NotificationBell from '../../components/layout/NotificationBell';
import shelfBackground from '../../assets/images/library/shelf-background.webp';
import libraryBell from '../../assets/images/library/notification.svg';
import libraryProfile from '../../assets/images/library/profile.svg';
import iconBack from '../../assets/images/library/icon-back-white.svg';
import iconTrash from '../../assets/images/library/icon-trash-white.svg';
import iconSoundOn from '../../assets/images/library/icon-sound-on-white.svg';
import iconSoundOff from '../../assets/images/library/icon-sound-off-white.svg';
import bookCover from '../../assets/images/library-cover-sample.png';
import SafeImage from '../../features/story/components/SafeImage';
import bookCoverStyles from '../../features/story/components/BookCover.module.css';
import StoryReader from '../../features/story/components/StoryReader';
import FeedbackDialog from '../../features/story/components/FeedbackDialog';
import { getFeedbackSubmission, markFeedbackSubmitted } from '../../features/story/feedbackSubmission';
import { clearPendingReadingFeedback, savePendingReadingFeedback } from '../../features/story/pendingReadingFeedback';
import { useSceneScale } from '../../features/story/hooks/useSceneScale';
import { isNarrationEnabled, saveNarrationEnabled, unlockNarration } from '../../features/story/narration';
import readerStyles from '../../features/story/components/StoryReader.module.css';
import { deleteStory, getBook, getGuide, getStoryDetail } from '../../services/storiesApi';
import {
  completeReading,
  resumeReading,
  saveReadingProgress,
  startReading,
} from '../../services/readingApi';
import styles from './StoryDetailPage.module.css';
import ErrorText from '../../components/ui/ErrorText';
import { getCurrentMember } from '../../services/homeApi';

// 900px 넘는 화면은 디자인(1440×960)을 통째로 비율대로 줄여 한 화면에 넣어요. (서재와 같아요)
// 화면이 디자인보다 넓거나 높으면 무대를 화면 크기만큼 넓혀서, 표지·글이 화면 가운데에 오게 해요.
const DESIGN_WIDTH = 1440;
const DESIGN_HEIGHT = 960;
const fitStage = () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  if (width <= 900) return { scale: 1, stage: null };
  const scale = Math.min(1, width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
  return { scale, stage: { width: width / scale, height: height / scale } };
};

function useFitStage() {
  const [fit, setFit] = useState(fitStage);
  useLayoutEffect(() => {
    const update = () => setFit(fitStage());
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);
  return fit;
}

// 앞·뒤표지가 둘 다 있는 책이에요. (이 기능 전에 만든 동화·표지가 실패한 동화는 없어요)
const hasBookCovers = (book) => Boolean(book?.frontCoverUrl && book?.backCoverUrl);

const preloadImage = (url, cache) => {
  if (!url) return Promise.resolve();
  if (cache.has(url)) return cache.get(url).ready;

  const image = new Image();
  image.decoding = 'async';
  image.src = url;
  const ready = image.decode
    ? image.decode().catch(() => {})
    : new Promise((resolve) => {
      if (image.complete) resolve();
      else {
        image.onload = resolve;
        image.onerror = resolve;
      }
    });
  cache.set(url, { image, ready });
  return ready;
};

// 서재에서 '아직 읽지 않았어요'·'함께 읽었어요' 동화를 누르면 보이는 '동화 한 눈에 보기' 화면이에요.
// 밤 나무 벽(서재와 같은 배경) 위에 비스듬히 놓인 표지, 제목·줄거리, '아이와 읽기 시작하기'·'대화 가이드 보기'가 있어요.
function StoryDetailPage() {
  const { storyId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const story = location.state?.story;
  const { scale, stage } = useFitStage();
  const feedbackScale = useSceneScale();
  const [detail, setDetail] = useState(null);
  const [guide, setGuide] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  // 아이와 읽는 중이면 { session, book, page }
  const [reading, setReading] = useState(null);
  const [readingFeedbackOpen, setReadingFeedbackOpen] = useState(false);
  const [feedbackMemberId, setFeedbackMemberId] = useState(null);
  const [checkingReadingFeedback, setCheckingReadingFeedback] = useState(false);
  // '대화 가이드 보기'로 미리보기와 같은 크게 보기 화면을 연 동안 { book, page }
  const [guideView, setGuideView] = useState(null);
  const [guideLoading, setGuideLoading] = useState(false);
  // 아이와 읽을 때 쪽마다 동화를 읽어 줄지예요. (제목 옆 스피커 버튼으로 켜고 끄고, 이 기기에 기억해요)
  const [narrationOn, setNarrationOn] = useState(isNarrationEnabled);
  const bookRequestRef = useRef(null);
  const preloadedImagesRef = useRef(new Map());

  const preloadReadingScene = useCallback((book, page) => {
    const cover = hasBookCovers(book) && page === 0
      ? (book.coverUrl || book.frontCoverUrl)
      : null;
    const scene = book.pages?.[page <= 0 ? 0 : page - 1]?.imageUrl;
    return Promise.all([cover, scene].map((url) => preloadImage(url, preloadedImagesRef.current)));
  }, []);

  useEffect(() => {
    let active = true;
    const images = preloadedImagesRef.current;
    const request = getBook(storyId);
    bookRequestRef.current = request;
    request.then((book) => {
      if (active) preloadReadingScene(book, hasBookCovers(book) ? 0 : 1);
    }).catch(() => {});

    return () => {
      active = false;
      if (bookRequestRef.current === request) bookRequestRef.current = null;
      images.clear();
    };
  }, [storyId, preloadReadingScene]);

  const loadDetail = useCallback(
    () =>
      getStoryDetail(storyId)
        .then(setDetail)
        .catch((error) => setLoadError(error.message || '동화를 불러오지 못했어요.')),
    [storyId],
  );

  useEffect(() => {
    loadDetail();
    // 대화 가이드는 확정한 동화만 받을 수 있어서, 못 받으면 가이드 없이 열어요.
    getGuide(storyId).then(setGuide).catch(() => setGuide(null));
  }, [loadDetail, storyId]);

  const title = detail?.title ?? story?.title ?? '';
  // 동화 줄거리는 synopsis예요. summary는 부모 고민(이번 이야기에서 나누고 싶은 것)이라 줄거리가 아니에요. 줄거리가 없는 옛 동화는 비워 둬요.
  const synopsis = detail?.synopsis ?? '';
  const coverUrl = detail?.coverUrl ?? story?.coverUrl;

  const handleDelete = async () => {
    if (!window.confirm('이 동화를 지울까요? 지우면 되돌릴 수 없어요.')) return;

    setNotice('');
    try {
      await deleteStory(storyId);
      navigate('/library');
    } catch (error) {
      setNotice(error.message || '동화를 지우지 못했어요.');
    }
  };

  // 끝나지 않은 읽기가 있으면 마지막으로 읽던 쪽부터 이어서, 없으면 새로 시작해요.
  const handleStartReading = useCallback(async () => {
    if (busy) return;

    // 책장이 넘어간 뒤 저절로 읽어 줄 수 있게, 누른 순간에 소리를 열어 둬요. (아이패드·아이폰)
    if (narrationOn) unlockNarration();
    setBusy(true);
    setNotice('');
    try {
      const bookRequest = bookRequestRef.current ?? getBook(storyId);
      const [book, resumed, member] = await Promise.all([bookRequest.catch(() => getBook(storyId)), resumeReading(storyId), getCurrentMember().catch(() => null)]);
      const session = resumed ?? (await startReading(storyId));
      savePendingReadingFeedback(member?.id, session.sessionId);
      // 앞·뒤표지가 있는 책은 처음 읽거나(읽던 쪽 0·1쪽) 마지막 쪽까지 읽은 기록이면 앞표지(0쪽)부터 보여줘요.
      // 중간 쪽에서 멈췄으면 그 쪽부터 이어서 읽어요. 표지가 없는 책은 지금처럼 읽던 쪽(없으면 1쪽)부터예요.
      const lastPage = session.lastPage ?? 0;
      const startPage = hasBookCovers(book)
        ? (lastPage <= 1 || lastPage >= book.pages.length ? 0 : lastPage)
        : Math.max(1, lastPage);
      await Promise.race([
        preloadReadingScene(book, startPage),
        new Promise((resolve) => window.setTimeout(resolve, 2000)),
      ]);
      setReading({ session, book, page: startPage });
    } catch (error) {
      setNotice(error.message || '읽기를 시작하지 못했어요.');
    } finally {
      setBusy(false);
    }
  }, [busy, narrationOn, storyId, preloadReadingScene]);

  // 확정한 직후 '아이와 바로 읽기'로 들어왔으면 상세에서 멈추지 않고 바로 읽기를 시작해요. (새로고침해도 다시 시작하지 않게 표시를 지워요)
  const autoStartDone = useRef(false);
  const shouldStartReading = Boolean(location.state?.startReading);
  useEffect(() => {
    if (!shouldStartReading || autoStartDone.current) return;

    autoStartDone.current = true;
    navigate(location.pathname, { replace: true, state: { story } });
    handleStartReading();
  }, [shouldStartReading, handleStartReading, navigate, location.pathname, story]);

  const toggleNarration = () => {
    const next = !narrationOn;
    setNarrationOn(next);
    saveNarrationEnabled(next);
  };

  const handleOpenGuide = async () => {
    if (guideLoading) return;

    setGuideLoading(true);
    setNotice('');
    try {
      const [book, loadedGuide] = await Promise.all([
        getBook(storyId),
        guide ?? getGuide(storyId).catch(() => null),
      ]);
      setGuide(loadedGuide);
      transitionScene(() => setGuideView({ book, page: 1 }));
    } catch (error) {
      setNotice(error.message || '대화 가이드를 불러오지 못했어요.');
    } finally {
      setGuideLoading(false);
    }
  };

  const handlePage = (page) => {
    setReading((current) => ({ ...current, page }));
    // 표지(0쪽, 마지막+1쪽)는 읽던 쪽으로 저장하지 않아요.
    if (page >= 1 && page <= reading.book.pages.length) {
      saveReadingProgress(reading.session.sessionId, page).catch(() => {});
    }
  };

  const handleCloseReading = () => {
    handleReadCompleteClick();
  };

  const handleFinishReading = async (feedback) => {
    try {
      await completeReading(reading.session.sessionId, feedback);
      clearPendingReadingFeedback(reading.session.sessionId);
      if (feedback) markFeedbackSubmitted(feedbackMemberId, 'reading');
      transitionScene(() => {
        setReadingFeedbackOpen(false);
        setReading(null);
      });
      loadDetail();
    } catch (error) {
      return error.message || '읽기를 마치지 못했어요.';
    }
  };

  const handleReadCompleteClick = async () => {
    if (checkingReadingFeedback) return;
    setCheckingReadingFeedback(true);
    try {
      const { memberId, submitted } = await getFeedbackSubmission('reading');
      setFeedbackMemberId(memberId);
      if (submitted) await handleFinishReading();
      else setReadingFeedbackOpen(true);
    } finally {
      setCheckingReadingFeedback(false);
    }
  };

  return (
    <div className={styles.page}>
      <img className={styles.background} src={shelfBackground} alt="" />
      <div className={styles.sidebarLayer}>
        <Sidebar compact showLogo={false} />
      </div>

      <div className={styles.topbar}>
        <NotificationBell iconSrc={libraryBell} />
        <button
          className={styles.avatarButton}
          type="button"
          onClick={() => navigate('/mypage')}
          aria-label="마이페이지"
        >
          <img className={styles.avatar} src={libraryProfile} alt="" />
        </button>
      </div>

      <main className={styles.stage} style={{ zoom: scale, ...stage }}>
        <div className={styles.headingRow}>
          <button className={styles.back} type="button" onClick={() => navigate('/library')} aria-label="서재로 돌아가기">
            <img src={iconBack} alt="" />
          </button>
          <h1 className={styles.heading}>동화 한 눈에 보기</h1>
        </div>

        {/* 표지는 살짝 기울여 탁자에 놓인 책처럼 보여줘요. */}
        <section className={styles.coverArea} aria-label="동화 표지">
          <div
            className={`${styles.cover} ${bookCoverStyles.bookCover}`}
            style={{ '--cover': `url(${JSON.stringify(coverUrl || bookCover)})` }}
          >
            <div className={bookCoverStyles.bookFace}>
              <div className={bookCoverStyles.bookArt}>
                <SafeImage
                  className={styles.coverImage}
                  src={coverUrl}
                  alt={`${title} 표지`}
                  fallback={<img className={styles.coverImage} src={bookCover} alt={`${title} 표지`} />}
                />
              </div>
            </div>
          </div>
        </section>

        <section className={styles.info} aria-labelledby="story-detail-title">
          <div className={styles.titleRow}>
            <h2 className={styles.title} id="story-detail-title">{title}</h2>
            <div className={styles.titleActions}>
              <button
                className={styles.sound}
                type="button"
                onClick={toggleNarration}
                aria-pressed={narrationOn}
                aria-label="동화 읽어 주기"
                title={narrationOn ? '동화 읽어 주기 끄기' : '동화 읽어 주기 켜기'}
              >
                <img src={narrationOn ? iconSoundOn : iconSoundOff} alt="" />
              </button>
              <button className={styles.trash} type="button" onClick={handleDelete} aria-label="동화 삭제">
                <img src={iconTrash} alt="" />
              </button>
            </div>
          </div>

          {synopsis && <p className={styles.synopsis}>{synopsis}</p>}

          <div className={styles.actions}>
            <button
              className={styles.readButton}
              type="button"
              onClick={handleStartReading}
              disabled={!detail?.canRead || busy}
            >
              {busy ? '불러오는 중…' : '아이와 읽기 시작하기'}
            </button>
            <button
              className={styles.guideButton}
              type="button"
              onClick={handleOpenGuide}
              disabled={guideLoading}
            >
              {guideLoading ? '불러오는 중…' : '대화 가이드 보기'}
            </button>
          </div>

          {(loadError || notice) && (
            <p className={styles.notice} role="alert">
              <ErrorText message={loadError || notice} />
            </p>
          )}
        </section>
      </main>

      {reading && (
        <StoryReader
          className={readerStyles.readingEntrance}
          title={reading.book.title}
          suspended={readingFeedbackOpen}
          pages={reading.book.pages}
          page={reading.page}
          onPage={handlePage}
          onClose={handleCloseReading}
          closeLabel="읽기 닫기"
          keepHeaderShown={hasBookCovers(reading.book) && reading.page === reading.book.pages.length + 1}
          // 앞·뒤표지가 있는 동화(frontCoverUrl·backCoverUrl)만 표지를 붙여요.
          // 앞표지는 서재와 같은 정사각형 표지(coverUrl)를 그대로 쓰고, 뒤표지는 가로 그림의 가운데를 정사각형으로 보여줘요.
          frontCover={hasBookCovers(reading.book) ? (reading.book.coverUrl || reading.book.frontCoverUrl) : null}
          backCover={hasBookCovers(reading.book) ? reading.book.backCoverUrl : null}
          narration={narrationOn}
        >
          {/* 표지가 있는 책은 뒤표지의 X로 읽기를 마쳐요. 뒤표지가 없는 옛 동화만 마지막 쪽에 '다 읽었어요'가 있어요. */}
          {!hasBookCovers(reading.book) && reading.page >= reading.book.pages.length && (
            <button className={readerStyles.primary} type="button" onClick={handleReadCompleteClick} disabled={checkingReadingFeedback}>
              {checkingReadingFeedback ? '확인하는 중…' : '다 읽었어요'}
            </button>
          )}
        </StoryReader>
      )}

      {readingFeedbackOpen && reading && (
        <FeedbackDialog
          variant="reading"
          sceneScale={feedbackScale}
          onSubmit={handleFinishReading}
        />
      )}

      {guideView && (
        <StoryReader
          title={guideView.book.title}
          pages={guideView.book.pages}
          page={guideView.page}
          onPage={(page) => setGuideView((current) => ({ ...current, page }))}
          onClose={() => transitionScene(() => setGuideView(null))}
          closeLabel="동화 상세로 돌아가기"
          guide={guide}
          previewMode
        />
      )}
    </div>
  );
}

export default StoryDetailPage;
