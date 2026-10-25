import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import NotificationBell from '../../components/layout/NotificationBell';
import avatarCircle from '../../assets/icons/avatar-circle.svg';
import avatarPerson from '../../assets/icons/avatar-person.svg';
import iconTrash from '../../assets/icons/icon-trash.svg';
import iconClose from '../../assets/remake/header-close.svg';
import bookCover from '../../assets/images/library-book-cover.png';
import SafeImage from '../../features/story/components/SafeImage';
import StoryReader from '../../features/story/components/StoryReader';
import readerStyles from '../../features/story/components/StoryReader.module.css';
import { deleteStory, getBook, getGuide, getStoryDetail } from '../../services/storiesApi';
import {
  completeReading,
  resumeReading,
  saveDialogue,
  saveReadingProgress,
  startReading,
} from '../../services/readingApi';
import styles from './StoryDetailPage.module.css';

// 읽기 가이드를 아직 못 받았을 때 대신 보여주는 기본 안내예요.
const FALLBACK_BEFORE = [
  '정답을 말해 주기보다 아이 말을 먼저 들어 주세요.',
  '아이가 이야기하고 싶어 하지 않으면 그냥 읽고 넘어가도 괜찮아요.',
];
const FALLBACK_AFTER = {
  bridgeQuestion: '“너도 친구랑 놀고 싶었는데 속상했던 적 있어?”',
  ifUndecided: '아이의 이야기로 꼭 넘어가지 않아도 괜찮아요',
};

// 읽는 쪽 아래에 보여주는 대화 질문과 '다 읽었어요' 버튼이에요.
function ReadingExtras({ reading, onDialogue, onFinish }) {
  const { book, page, answers } = reading;
  const prompt = book.prompts?.find((item) => item.afterPage === page);
  const isLast = page === book.pages.length;

  if (!prompt && !isLast) return null;

  return (
    <>
      {prompt && (
        <>
          <span>{prompt.question}</span>
          <button
            className={answers[prompt.id] === 'TALKED' ? readerStyles.primary : ''}
            type="button"
            onClick={() => onDialogue(prompt.id, 'TALKED')}
          >
            이야기 나눴어요
          </button>
          <button
            className={answers[prompt.id] === 'SKIPPED' ? readerStyles.primary : ''}
            type="button"
            onClick={() => onDialogue(prompt.id, 'SKIPPED')}
          >
            건너뛰기
          </button>
        </>
      )}
      {isLast && (
        <button className={readerStyles.primary} type="button" onClick={onFinish}>
          다 읽었어요
        </button>
      )}
    </>
  );
}

// 서재에서 '아직 읽지 않았어요'·'함께 읽었어요' 동화를 누르면 보이는 동화 상세 화면이에요.
function StoryDetailPage() {
  const { storyId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const story = location.state?.story;
  const [detail, setDetail] = useState(null);
  const [guide, setGuide] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  // 아이와 읽는 중이면 { session, book, page, answers }
  const [reading, setReading] = useState(null);

  const loadDetail = useCallback(
    () =>
      getStoryDetail(storyId)
        .then(setDetail)
        .catch((error) => setLoadError(error.message || '동화를 불러오지 못했어요.')),
    [storyId],
  );

  useEffect(() => {
    loadDetail();
    // 대화 가이드는 확정한 동화만 받을 수 있어서, 못 받으면 기본 안내를 보여줘요.
    getGuide(storyId).then(setGuide).catch(() => setGuide(null));
  }, [loadDetail, storyId]);

  const title = detail?.title ?? story?.title ?? '';
  const summary = detail?.summary ?? '';
  const coverUrl = detail?.coverUrl ?? story?.coverUrl;
  const beforeLines = guide
    ? [guide.beforeReading?.intent, ...(guide.beforeReading?.tips ?? [])].filter(Boolean)
    : FALLBACK_BEFORE;
  const after = guide?.afterReading ?? FALLBACK_AFTER;

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
  const handleStartReading = async () => {
    if (busy) return;

    setBusy(true);
    setNotice('');
    try {
      const [book, resumed] = await Promise.all([getBook(storyId), resumeReading(storyId)]);
      const session = resumed ?? (await startReading(storyId));
      setReading({ session, book, page: Math.max(1, session.lastPage), answers: {} });
    } catch (error) {
      setNotice(error.message || '읽기를 시작하지 못했어요.');
    } finally {
      setBusy(false);
    }
  };

  const handlePage = (page) => {
    setReading((current) => ({ ...current, page }));
    saveReadingProgress(reading.session.sessionId, page).catch(() => {});
  };

  const handleDialogue = (promptId, action) => {
    setReading((current) => ({ ...current, answers: { ...current.answers, [promptId]: action } }));
    saveDialogue(reading.session.sessionId, promptId, action).catch(() => {});
  };

  const handleFinishReading = async () => {
    try {
      await completeReading(reading.session.sessionId);
      setReading(null);
      loadDetail();
    } catch (error) {
      setNotice(error.message || '읽기를 마치지 못했어요.');
    }
  };

  return (
    <div className={styles.page}>
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
          <nav className={styles.crumbs} aria-label="현재 위치">
            <Link to="/library">서재</Link>
            <span aria-hidden="true">&gt;</span>
            <span>{title}</span>
            <span aria-hidden="true">&gt;</span>
            <span aria-current="page">동화 상세</span>
          </nav>
          <div className={styles.headingRow}>
            <h1 className={styles.heading}>동화 한 눈에 보기</h1>
            <button className={styles.close} type="button" onClick={() => navigate('/library')} aria-label="서재로 돌아가기">
              <img src={iconClose} alt="" />
            </button>
          </div>

          {(loadError || notice) && (
            <p className={styles.notice} role="alert">
              {loadError || notice}
            </p>
          )}

          <div className={styles.detail}>
            <section className={styles.bookColumn} aria-label="동화 표지">
              <div className={styles.cover}>
                <SafeImage
                  className={styles.coverFull}
                  src={coverUrl}
                  alt={`${title} 표지`}
                  fallback={<img className={styles.coverCrop} src={bookCover} alt={`${title} 표지`} />}
                />
              </div>

              <div className={styles.titleRow}>
                <h2 className={styles.title}>{title}</h2>
                <button className={styles.trash} type="button" onClick={handleDelete} aria-label="동화 삭제">
                  <img src={iconTrash} alt="" />
                </button>
              </div>

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
                onClick={() => navigate(`/library/${storyId}/guide`, { state: { story } })}
              >
                대화 가이드 보기
              </button>
            </section>

            <div className={styles.cards}>
              <section className={`${styles.card} ${styles.summaryCard}`}>
                <h2>동화 줄거리</h2>
                <p>{summary}</p>
              </section>
              <section className={styles.card}>
                <h2>읽기 전에</h2>
                <p>
                  {beforeLines.map((line, index) => (
                    <span key={line}>
                      {index > 0 && <br />}
                      {line}
                    </span>
                  ))}
                </p>
              </section>
              <section className={`${styles.card} ${styles.afterCard}`}>
                <h2>다 읽은 뒤에</h2>
                <p className={styles.question}>{after.bridgeQuestion}</p>
                <p>{after.ifUndecided}</p>
              </section>
            </div>
          </div>
        </main>
      </div>

      {reading && (
        <StoryReader
          title={reading.book.title}
          pages={reading.book.pages}
          page={reading.page}
          onPage={handlePage}
          onClose={() => setReading(null)}
          closeLabel="읽기 닫기"
        >
          <ReadingExtras
            reading={reading}
            onDialogue={handleDialogue}
            onFinish={handleFinishReading}
          />
        </StoryReader>
      )}
    </div>
  );
}

export default StoryDetailPage;
