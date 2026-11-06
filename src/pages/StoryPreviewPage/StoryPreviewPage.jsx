import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import pageArrowInactive from '../../assets/story-preview-guide/page-left.svg';
import pageArrowActive from '../../assets/story-preview-guide/page-right.svg';
import headerClose from '../../assets/remake/header-close.svg';
import mascotBase from '../../assets/story-preview-guide/mascot-base.svg';
import mascotFace from '../../assets/story-preview-guide/mascot-face.png';
import guideDot from '../../assets/story-preview-guide/guide-dot.svg';
import toggleBackground from '../../assets/story-preview-guide/toggle-bg.svg';
import toggleChevron from '../../assets/story-preview-guide/toggle-chevron.svg';
import guidePanelBackground from '../../assets/story-preview-guide/guide-panel.svg';
import guideQuestion from '../../assets/story-preview-guide/guide-question.svg';
import guideHand from '../../assets/story-preview-guide/guide-hand.svg';
import styles from './StoryPreviewPage.module.css';

import { useSceneScale } from '../../features/story/hooks/useSceneScale';
import { useStoryGeneration } from '../../features/story/generation/useStoryGeneration';
import RemakeDialog from '../../features/story/components/RemakeDialog';
import StoryReader from '../../features/story/components/StoryReader';
import SafeImage from '../../features/story/components/SafeImage';
import StoryText from '../../features/story/components/StoryText';
import StoryTextBlocks from '../../features/story/components/StoryTextBlocks';
import PageTurnOverlay from '../../features/story/components/PageTurnOverlay';
import { usePageTurn } from '../../features/story/hooks/usePageTurn';
import { useImageQueue } from '../../features/story/hooks/useImageQueue';
import { textPositionOf } from '../../features/story/textPosition';
import { guideFor, NO_GUIDE_MESSAGE } from '../../features/story/guideContent';
import { approveStory, getGuide, getPreview, getVersions, regenerateStory, setCurrentVersion } from '../../services/storiesApi';
import ErrorText from '../../components/ui/ErrorText';
import { useNotifications } from '../../features/notifications/useNotifications';

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
  const { updateStoryNotificationHref } = useNotifications();
  const scale = useSceneScale();
  const [preview, setPreview] = useState(null);
  // 동화 줄거리(상세)와 대화 가이드예요. 가이드는 확정 전(REVIEWING)에도 받을 수 있어요.
  const [guide, setGuide] = useState(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isHintOpen, setIsHintOpen] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [isRemakeOpen, setIsRemakeOpen] = useState(initialRemakeOpen);
  const [approving, setApproving] = useState(false);
  const [notice, setNotice] = useState('');
  // 다시 만들면 이전 버전도 남아 있어요. 버전이 둘 이상이면 서로 오갈 수 있어요. (버전 번호 순서예요)
  const [versions, setVersions] = useState([]);
  const [switchingVersion, setSwitchingVersion] = useState(false);

  useEffect(() => {
    let active = true;
    getPreview(storyId)
      .then((result) => active && setPreview(result))
      .catch((error) => active && setLoadError(error.message || '미리보기를 불러오지 못했어요.'));
    getGuide(storyId)
      .then((result) => active && setGuide(result))
      .catch(() => {});
    getVersions(storyId)
      .then((result) => active && setVersions(result))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [storyId]);

  useEffect(() => {
    if (!isHintOpen) return undefined;
    const timer = window.setTimeout(() => setIsHintOpen(false), 3500);
    return () => window.clearTimeout(timer);
  }, [isHintOpen]);

  const pages = preview?.pages ?? [];
  const title = preview?.version?.title ?? story.title ?? '';
  // 다시 만들기 횟수는 서버가 알려주는 값(regenerateRemaining)을 그대로 써요.
  const remaining = preview?.regenerateRemaining ?? 0;
  const canRemake = remaining > 0;
  // 마지막 버전을 보고 있으면 이전 버전으로, 이전 버전을 보고 있으면 다음 버전으로 가요. 확정 전에만 바꿀 수 있어요.
  const versionIndex = versions.findIndex((version) => version.id === preview?.version?.id);
  const isLatestVersion = versionIndex === versions.length - 1;
  const switchTarget = preview?.status === 'REVIEWING' && versions.length > 1 && versionIndex >= 0
    ? versions[versionIndex + (isLatestVersion ? -1 : 1)]
    : null;
  // 그림 10장(수십 MB)을 한 번에 받지 않고, 지금 쪽에서 가까운 순서로 한 장씩 받아 메모리에 담아 두고 큰 그림·썸네일·크게 보기가 함께 써요.
  const imageSources = useImageQueue(pages.map((item) => item.imageUrl), currentPage);
  const sourceOf = (item) => imageSources.get(item.imageUrl);
  // 그림이 안 보일 때 보여줄 안내예요. (받는 중 / 만들지 못함 / 준비 중 / 받지 못함)
  const imageNote = (item) => {
    if (item.imageStatus === 'FAILED') return '이 쪽의 그림을 만들지 못했어요.';
    if (item.imageUrl && !imageSources.has(item.imageUrl)) return '그림을 불러오는 중이에요.';
    if (item.imageStatus === 'PENDING') return '그림을 준비하는 중이에요.';
    return '그림을 불러오지 못했어요.';
  };
  const turn = usePageTurn(currentPage, pages.map((item) => sourceOf(item) ?? null));

  const closeRemake = () => {
    if (initialRemakeOpen) {
      navigate('/library');
      return;
    }
    setIsRemakeOpen(false);
  };

  // 다시 만들기를 시작하면 만드는 중 화면으로 가요. 못 하면 이유를 팝업에 돌려줘요.
  const remake = async ({ type, request, pages: selectedPages = [] }) => {
    try {
      const response = await regenerateStory(storyId, {
        scope: REMAKE_SCOPES[type],
        ...(type === 'image' ? { pages: selectedPages } : {}),
        ...(request ? { feedback: request } : {}),
      });
      const safety = response.safety;
      if (safety?.action === 'ASK_REVISE') return safety.reason || '요청을 조금 바꿔서 다시 써 주세요.';
      if (safety?.action === 'BLOCK') return safety.reason || '이 요청으로는 다시 만들 수 없어요.';

      startGeneration(Number(storyId), { scope: REMAKE_SCOPES[type] });
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
      updateStoryNotificationHref(storyId, '/library?filter=UNREAD');
      navigate('/library?filter=UNREAD', { state: { story: { ...story, id: Number(storyId), title }, newlyCreated: true } });
    } catch (error) {
      setNotice(error.message || '확정하지 못했어요. 잠시 뒤에 다시 시도해 주세요.');
      setApproving(false);
    }
  };

  // 서버에서 보여 줄 버전을 바꿔요. '전체 동화 확정'은 지금 보고 있는 버전으로 확정돼요.
  const switchVersion = async () => {
    if (switchingVersion || !switchTarget) return;

    setSwitchingVersion(true);
    setNotice('');
    try {
      const nextPreview = await setCurrentVersion(storyId, switchTarget.id);
      setPreview(nextPreview);
      setCurrentPage((page) => Math.min(page, nextPreview.pages.length));
      setIsGuideOpen(false);
      setIsHintOpen(false);
      // 대화 가이드도 버전마다 달라요.
      setGuide(await getGuide(storyId).catch(() => null));
    } catch (error) {
      setNotice(error.message || '동화를 바꾸지 못했어요. 잠시 뒤에 다시 시도해 주세요.');
    } finally {
      setSwitchingVersion(false);
    }
  };

  const showPage = (nextPage) => {
    setIsGuideOpen(false);
    setIsHintOpen(false);
    setCurrentPage(Math.min(pages.length, Math.max(1, nextPage)));
  };

  const page = pages[currentPage - 1];
  // 실제 가이드 문구가 있는 쪽에서만 안내 표시를 보여줘요.
  const pageGuide = guide ? guideFor(guide, currentPage, pages.length) : null;
  const guidePrompt = guide?.prompts?.find((item) => item.afterPage === currentPage);
  const hasGuideContent = Boolean(
    guidePrompt?.sceneNote?.trim() || guidePrompt?.question?.trim() || guidePrompt?.parentHint?.trim()
    || (currentPage === 1 && (guide?.beforeReading?.intent?.trim() || guide?.beforeReading?.tips?.some((tip) => tip?.trim())))
    || (currentPage === pages.length && (guide?.afterReading?.bridgeQuestion?.trim() || guide?.afterReading?.ifUndecided?.trim())),
  );
  const lines = page ? page.text.split('\n').filter(Boolean) : [];

  const renderHeader = () => (
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
        <div className={styles.desktopHeader}>{renderHeader()}</div>
        <div className={styles.canvas} style={{ '--scene-scale': scale }}>
          <div className={styles.canvasHeader}>{renderHeader()}</div>
          <p className={styles.status} role={loadError ? 'alert' : 'status'}>
            {loadError ? <ErrorText message={loadError} /> : '미리보기를 불러오는 중이에요.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.desktopHeader}>{renderHeader()}</div>
      <div className={styles.canvas} style={{ '--scene-scale': scale }}>
        <div className={styles.canvasHeader}>{renderHeader()}</div>

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
                {imageSources.has(item.imageUrl) ? (
                  <SafeImage
                    src={sourceOf(item)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    fallback={<div className={styles.noImage} aria-hidden="true" />}
                  />
                ) : (
                  <div className={styles.noImage} aria-hidden="true" />
                )}
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
              src={sourceOf(page)}
              alt={`${currentPage}쪽 동화 삽화`}
              fallback={(
                <p className={styles.noImageText}>
                  {imageNote(page)}
                </p>
              )}
            />
            {page.textBlocks == null ? (
              <div className={styles.pageCopy} data-position={textPositionOf(page)}>
                {lines.map((line) => <p key={line}><StoryText text={line} /></p>)}
              </div>
            ) : <StoryTextBlocks blocks={page.textBlocks} />}
            <PageTurnOverlay turn={turn} />
          </div>
          <div className={styles.pagination}>
            <button type="button" aria-label="이전 쪽" onClick={() => showPage(currentPage - 1)} disabled={currentPage === 1}>
              <img src={currentPage === 1 ? pageArrowInactive : pageArrowActive} alt="" />
            </button>
            <strong><span>{currentPage}</span> / {pages.length}</strong>
            <button type="button" aria-label="다음 쪽" onClick={() => showPage(currentPage + 1)} disabled={currentPage === pages.length}>
              <img src={currentPage === pages.length ? pageArrowInactive : pageArrowActive} alt="" />
            </button>
          </div>
        </main>

        <aside
          className={`${styles.guidePanel} ${isGuideOpen && hasGuideContent ? styles.guidePanelOpen : ''} ${isRemakeOpen ? styles.guideSuppressed : ''}`}
          id="preview-guide"
          aria-hidden={!isGuideOpen || !hasGuideContent || isRemakeOpen}
          inert={!isGuideOpen || !hasGuideContent || isRemakeOpen}
        >
          <img className={styles.guidePanelBackground} src={guidePanelBackground} alt="" />
          <div className={styles.guidePanelContent}>
            <section className={styles.guideScene}>
              <h2>이번 장면에서는</h2>
              {pageGuide?.description && <p className={styles.guideLead}>{pageGuide.description}</p>}
              {pageGuide?.scene && <p className={styles.guideDetail}><img src={guideHand} alt="" />{pageGuide.scene}</p>}
            </section>
            <section className={styles.guideResponse}>
              <h2>아이가 대답할 때에는</h2>
              {pageGuide?.hint && <p className={styles.guideLead}>{pageGuide.hint}</p>}
              {pageGuide?.question && <p className={styles.guideDetail}><img src={guideQuestion} alt="" />{pageGuide.question}</p>}
            </section>
          </div>
        </aside>

        <aside
          className={`${styles.guideHint} ${isHintOpen && !hasGuideContent ? styles.guideHintOpen : ''} ${isRemakeOpen ? styles.guideSuppressed : ''}`}
          id="preview-guide-hint"
          aria-hidden={!isHintOpen || hasGuideContent || isRemakeOpen}
          inert={!isHintOpen || hasGuideContent || isRemakeOpen}
        >
          {NO_GUIDE_MESSAGE}
        </aside>

        <button
          className={`${styles.guideToggle} ${isRemakeOpen ? styles.guideSuppressed : ''}`}
          type="button"
          onClick={() => {
            if (hasGuideContent) {
              setIsHintOpen(false);
              setIsGuideOpen((open) => !open);
            } else if (guide) {
              setIsHintOpen((open) => !open);
            }
          }}
          aria-label={hasGuideContent ? (isGuideOpen ? '가이드 닫기' : '가이드 열기') : isHintOpen ? '안내 닫기' : '안내 보기'}
          aria-expanded={hasGuideContent ? isGuideOpen : isHintOpen}
          aria-disabled={!guide}
          aria-controls={hasGuideContent ? 'preview-guide' : 'preview-guide-hint'}
          inert={isRemakeOpen}
        >
          {isGuideOpen && hasGuideContent ? (
            <>
              <img className={styles.toggleBackground} src={toggleBackground} alt="" />
              <img className={styles.toggleChevron} src={toggleChevron} alt="" />
            </>
          ) : (
            <>
              <img className={styles.mascotBase} src={mascotBase} alt="" />
              <img className={styles.mascotFace} src={mascotFace} alt="" />
              {hasGuideContent && <img className={styles.guideDot} src={guideDot} alt="" />}
            </>
          )}
        </button>

        <div className={`${styles.actions} ${switchTarget ? styles.actionsWithSwitch : ''}`} inert={isRemakeOpen}>
          <div className={styles.remakeAction}>
            <button type="button" onClick={() => setIsRemakeOpen(true)} disabled={!canRemake}>
              다시 만들기
            </button>
          </div>
          {switchTarget && (
            <button className={styles.switchVersion} type="button" onClick={switchVersion} disabled={switchingVersion}>
              {isLatestVersion ? '이전 동화로 돌아가기' : '이후 동화로 돌아가기'}
            </button>
          )}
          <button className={styles.confirm} type="button" onClick={approve} disabled={approving}>
            {approving ? '확정하는 중…' : '전체 동화 확정'}
          </button>
          {notice && (
            <p className={styles.actionError} role="alert">
              <ErrorText message={notice} />
            </p>
          )}
        </div>
      </div>
      {isRemakeOpen && <RemakeDialog pages={pages} sceneScale={scale} onClose={closeRemake} onRemake={remake} />}
      {isReaderOpen && (
        <StoryReader
          title={title}
          pages={pages.map((item) => ({ ...item, imageUrl: sourceOf(item) ?? '' }))}
          page={currentPage}
          onPage={showPage}
          onClose={() => setIsReaderOpen(false)}
          closeLabel="미리보기로 돌아가기"
          guide={guide}
          previewMode
        />
      )}
    </div>
  );
}

export default StoryPreviewPage;
