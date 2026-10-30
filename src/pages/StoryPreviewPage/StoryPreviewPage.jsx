import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import pageArrowLeft from '../../assets/remake/page-arrow-left.svg';
import pageArrowRight from '../../assets/remake/page-arrow-right.svg';
import headerClose from '../../assets/remake/header-close.svg';
import styles from './StoryPreviewPage.module.css';

import { useSceneScale } from '../../features/story/hooks/useSceneScale';
import { useStoryGeneration } from '../../features/story/generation/useStoryGeneration';
import RemakeDialog from '../../features/story/components/RemakeDialog';
import StoryReader from '../../features/story/components/StoryReader';
import SafeImage from '../../features/story/components/SafeImage';
import StoryText from '../../features/story/components/StoryText';
import PageTurnOverlay from '../../features/story/components/PageTurnOverlay';
import { usePageTurn } from '../../features/story/hooks/usePageTurn';
import { guideFor } from '../../features/story/guideContent';
import { approveStory, getGuide, getPreview, getStoryDetail, regenerateStory } from '../../services/storiesApi';
import ErrorText from '../../components/ui/ErrorText';

// 화면의 '다시 만들 부분'을 API의 scope로 바꿔요.
const REMAKE_SCOPES = { all: 'CHARACTER_STORY', text: 'TEXT', image: 'IMAGES' };

// 만든 동화를 확정하기 전에 쪽마다 넘겨 보는 화면이에요. (GET /api/stories/{id}/preview)
// initialRemakeOpen: '다시 만들기' 팝업을 연 채로 시작해요. 이때 팝업을 닫으면 서재로 돌아가요.
function StoryPreviewPage({ initialRemakeOpen = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { storyId } = useParams();
  const story = location.state?.story ?? {};
  const { startGeneration } = useStoryGeneration();
  const scale = useSceneScale();
  const [preview, setPreview] = useState(null);
  // 동화 줄거리(상세)와 대화 가이드예요. 가이드는 확정 전(REVIEWING)에도 받을 수 있어요.
  const [synopsis, setSynopsis] = useState('');
  const [guide, setGuide] = useState(null);
  const [guideFailed, setGuideFailed] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [isRemakeOpen, setIsRemakeOpen] = useState(initialRemakeOpen);
  const [approving, setApproving] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    getPreview(storyId)
      .then((result) => active && setPreview(result))
      .catch((error) => active && setLoadError(error.message || '미리보기를 불러오지 못했어요.'));
    getStoryDetail(storyId)
      .then((detail) => active && setSynopsis(detail.synopsis ?? ''))
      .catch(() => {});
    getGuide(storyId)
      .then((result) => active && setGuide(result))
      .catch(() => active && setGuideFailed(true));
    return () => {
      active = false;
    };
  }, [storyId]);

  const pages = preview?.pages ?? [];
  const title = preview?.version?.title ?? story.title ?? '';
  // 다시 만들기 횟수는 서버가 알려주는 값(regenerateRemaining)을 그대로 써요.
  const remaining = preview?.regenerateRemaining ?? 0;
  const canRemake = remaining > 0;
  const turn = usePageTurn(currentPage, pages.map((item) => item.imageUrl));

  const closeRemake = () => {
    if (initialRemakeOpen) {
      navigate('/library');
      return;
    }
    setIsRemakeOpen(false);
  };

  // 다시 만들기를 시작하면 만드는 중 화면으로 가요. 못 하면 이유를 팝업에 돌려줘요.
  const remake = async ({ type, request }) => {
    try {
      const response = await regenerateStory(storyId, {
        scope: REMAKE_SCOPES[type],
        ...(request ? { feedback: request } : {}),
      });
      const safety = response.safety;
      if (safety?.action === 'ASK_REVISE') return safety.reason || '요청을 조금 바꿔서 다시 써 주세요.';
      if (safety?.action === 'BLOCK') return safety.reason || '이 요청으로는 다시 만들 수 없어요.';

      startGeneration(Number(storyId));
      navigate('/story/new', { state: { generation: { storyId: Number(storyId) } } });
      return '';
    } catch (error) {
      return error.message || '다시 만들지 못했어요. 잠시 뒤에 다시 시도해 주세요.';
    }
  };

  // 지금 보여 주는 버전으로 확정하고, 서재에서 '서재에 저장했어요' 팝업을 보여줘요.
  const approve = async () => {
    if (approving) return;

    setApproving(true);
    setNotice('');
    try {
      await approveStory(storyId);
      navigate('/library', { state: { story: { ...story, id: Number(storyId), title }, newlyCreated: true } });
    } catch (error) {
      setNotice(error.message || '확정하지 못했어요. 잠시 뒤에 다시 시도해 주세요.');
      setApproving(false);
    }
  };

  const showPage = (nextPage) => {
    setCurrentPage(Math.min(pages.length, Math.max(1, nextPage)));
  };

  const page = pages[currentPage - 1];
  // 쪽마다 설명·가이드가 있으면 그걸, 아직 없으면 동화 줄거리를 보여줘요.
  const pageGuide = guide ? guideFor(guide, currentPage, pages.length) : null;
  const lines = page ? page.text.split('\n').filter(Boolean) : [];

  const header = (
    <header className={styles.header}>
      <Link className={styles.logo} to="/home" aria-label="FIRSTORY 홈">FIRSTORY</Link>
      <button className={styles.close} type="button" onClick={() => navigate('/library')} aria-label="서재로 돌아가기">
        <img src={headerClose} alt="" />
      </button>
    </header>
  );

  if (!preview) {
    return (
      <div className={styles.page}>
        <div className={styles.canvas} style={{ '--scene-scale': scale }}>
          {header}
          <p className={styles.status} role={loadError ? 'alert' : 'status'}>
            {loadError ? <ErrorText message={loadError} /> : '미리보기를 불러오는 중이에요.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.canvas} style={{ '--scene-scale': scale }}>
        {header}

        <h1 className={styles.heading}>미리보기</h1>

        <nav className={styles.pageList} aria-label="동화 페이지" inert={isRemakeOpen}>
          {pages.map((item) => {
            const selected = currentPage === item.pageNo;
            return (
              <button
                className={`${styles.thumbnail} ${selected ? styles.selectedThumbnail : ''}`}
                type="button"
                key={item.pageNo}
                onClick={() => showPage(item.pageNo)}
                aria-label={`${item.pageNo}쪽 미리보기`}
                aria-current={selected ? 'page' : undefined}
              >
                <SafeImage src={item.imageUrl} alt="" fallback={<div className={styles.noImage} aria-hidden="true" />} />
                <span>{item.pageNo}</span>
              </button>
            );
          })}
        </nav>

        <main className={styles.book} inert={isRemakeOpen}>
          <div
            className={styles.illustration}
            role="button"
            tabIndex={0}
            aria-label={`${currentPage}쪽 동화 크게 보기`}
            onClick={() => setIsReaderOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setIsReaderOpen(true);
              }
            }}
          >
            <SafeImage
              src={page.imageUrl}
              alt={`${currentPage}쪽 동화 삽화`}
              fallback={(
                <p className={styles.noImageText}>
                  {page.imageStatus === 'FAILED'
                    ? '이 쪽의 그림을 만들지 못했어요.'
                    : page.imageStatus === 'PENDING'
                      ? '그림을 준비하는 중이에요.'
                      : '그림을 불러오지 못했어요.'}
                </p>
              )}
            />
            <div className={styles.pageCopy}>
              {lines.map((line) => <p key={line}><StoryText text={line} /></p>)}
            </div>
            <PageTurnOverlay turn={turn} />
          </div>
          <div className={styles.pagination}>
            <button type="button" onClick={() => showPage(currentPage - 1)} disabled={currentPage === 1}>
              <img src={pageArrowLeft} alt="" /> 이전 쪽
            </button>
            <strong><span>{currentPage}</span> / {pages.length}</strong>
            <button type="button" onClick={() => showPage(currentPage + 1)} disabled={currentPage === pages.length}>
              다음 쪽 <img src={pageArrowRight} alt="" />
            </button>
          </div>
        </main>

        <aside className={styles.storyInfo} inert={isRemakeOpen}>
          <section>
            <h2>동화 설명</h2>
            <p>{pageGuide?.description || synopsis || title}</p>
          </section>
          <section>
            <h2>부모를 위한 가이드</h2>
            <p>{pageGuide ? pageGuide.talk : guideFailed ? '대화 가이드를 불러오지 못했어요.' : '대화 가이드를 불러오는 중이에요.'}</p>
          </section>
          <p className={styles.remakeNote}>
            {canRemake ? `다시 만들기는 ${remaining}회 가능해요` : '다시 만들기를 사용했어요'}
          </p>
        </aside>

        <div className={styles.actions} inert={isRemakeOpen}>
          <div className={styles.remakeAction}>
            <button type="button" onClick={() => setIsRemakeOpen(true)} disabled={!canRemake}>
              다시 만들기
            </button>
          </div>
          <button className={styles.confirm} type="button" onClick={approve} disabled={approving}>
            {approving ? '확정하는 중…' : '이대로 확정'}
          </button>
          {notice && (
            <p className={styles.actionError} role="alert">
              <ErrorText message={notice} />
            </p>
          )}
        </div>
        {isRemakeOpen && <RemakeDialog onClose={closeRemake} onRemake={remake} />}
      </div>
      {isReaderOpen && (
        <StoryReader
          title={title}
          pages={pages}
          page={currentPage}
          onPage={setCurrentPage}
          onClose={() => setIsReaderOpen(false)}
          closeLabel="미리보기로 돌아가기"
        />
      )}
    </div>
  );
}

export default StoryPreviewPage;
