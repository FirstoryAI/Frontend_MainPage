import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import NotificationBell from '../../components/layout/NotificationBell';
import shelfBackground from '../../assets/images/library/shelf-background.webp';
import libraryBell from '../../assets/images/library/notification.svg';
import libraryProfile from '../../assets/images/library/profile.svg';
import iconBack from '../../assets/images/library/icon-back-white.svg';
import iconTrash from '../../assets/images/library/icon-trash-white.svg';
import bookCover from '../../assets/images/library-cover-sample.png';
import SafeImage from '../../features/story/components/SafeImage';
import bookCoverStyles from '../../features/story/components/BookCover.module.css';
import StoryReader from '../../features/story/components/StoryReader';
import FeedbackDialog from '../../features/story/components/FeedbackDialog';
import { getFeedbackSubmission, markFeedbackSubmitted } from '../../features/story/feedbackSubmission';
import { useSceneScale } from '../../features/story/hooks/useSceneScale';
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

    setBusy(true);
    setNotice('');
    try {
      const [book, resumed] = await Promise.all([getBook(storyId), resumeReading(storyId)]);
      const session = resumed ?? (await startReading(storyId));
      // 앞·뒤표지가 있으면 처음 읽을 때는 앞표지(0쪽)부터 보여줘요. 읽던 쪽이 있으면 그 쪽부터예요.
      const hasCovers = Boolean(book.frontCoverUrl && book.backCoverUrl);
      setReading({ session, book, page: session.lastPage >= 1 ? session.lastPage : (hasCovers ? 0 : 1) });
    } catch (error) {
      setNotice(error.message || '읽기를 시작하지 못했어요.');
    } finally {
      setBusy(false);
    }
  }, [busy, storyId]);

  // 확정한 직후 '아이와 바로 읽기'로 들어왔으면 상세에서 멈추지 않고 바로 읽기를 시작해요. (새로고침해도 다시 시작하지 않게 표시를 지워요)
  const autoStartDone = useRef(false);
  const shouldStartReading = Boolean(location.state?.startReading);
  useEffect(() => {
    if (!shouldStartReading || autoStartDone.current) return;

    autoStartDone.current = true;
    navigate(location.pathname, { replace: true, state: { story } });
    handleStartReading();
  }, [shouldStartReading, handleStartReading, navigate, location.pathname, story]);

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
      setGuideView({ book, page: 1 });
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

  const handleFinishReading = async (feedback) => {
    try {
      await completeReading(reading.session.sessionId, feedback);
      if (feedback) markFeedbackSubmitted(feedbackMemberId, 'reading');
      setReadingFeedbackOpen(false);
      setReading(null);
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
            <button className={styles.trash} type="button" onClick={handleDelete} aria-label="동화 삭제">
              <img src={iconTrash} alt="" />
            </button>
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
          title={reading.book.title}
          suspended={readingFeedbackOpen}
          pages={reading.book.pages}
          page={reading.page}
          onPage={handlePage}
          onClose={() => setReading(null)}
          closeLabel="읽기 닫기"
          frontCover={reading.book.frontCoverUrl}
          backCover={reading.book.backCoverUrl}
        >
          {/* 마지막 쪽과 뒤표지에서 '다 읽었어요'를 보여줘요. */}
          {reading.page >= reading.book.pages.length && (
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
          onClose={() => setGuideView(null)}
          closeLabel="동화 상세로 돌아가기"
          guide={guide}
          previewMode
        />
      )}
    </div>
  );
}

export default StoryDetailPage;
