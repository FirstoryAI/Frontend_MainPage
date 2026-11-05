import { useCallback, useEffect, useState } from 'react';
import readerFrame from '../../../assets/story-reader/frame.svg';
import previewFrame from '../../../assets/story-reader/preview-frame.svg';
import readerArrowLeft from '../../../assets/story-reader/arrow-left.svg';
import readerArrowRight from '../../../assets/story-reader/arrow-right.svg';
import readerClose from '../../../assets/story-reader/close.svg';
import pageArrowInactive from '../../../assets/story-preview-guide/page-left.svg';
import pageArrowActive from '../../../assets/story-preview-guide/page-right.svg';
import guidePanelBackground from '../../../assets/story-preview-guide/guide-panel.svg';
import guideHand from '../../../assets/story-preview-guide/guide-hand.svg';
import guideQuestion from '../../../assets/story-preview-guide/guide-question.svg';
import toggleBackground from '../../../assets/story-preview-guide/toggle-bg.svg';
import toggleChevron from '../../../assets/story-preview-guide/toggle-chevron.svg';
import mascotBase from '../../../assets/story-preview-guide/mascot-base.svg';
import mascotFace from '../../../assets/story-preview-guide/mascot-face.png';
import guideDot from '../../../assets/story-preview-guide/guide-dot.svg';
import { guideFor, NO_GUIDE_MESSAGE } from '../guideContent';
import { usePageTurn } from '../hooks/usePageTurn';
import PageTurnOverlay from './PageTurnOverlay';
import SafeImage from './SafeImage';
import StoryText from './StoryText';
import StoryTextBlocks from './StoryTextBlocks';
import { textPositionOf } from '../textPosition';
import styles from './StoryReader.module.css';

// 동화를 화면 가득 크게 읽는 화면이에요. 미리보기(확정 전)와 아이와 읽기(확정 후)가 함께 써요.
// pages: [{ pageNo, text, imageUrl, imageStatus }], page: 지금 쪽(1부터), children: 쪽 아래에 띄울 보조 영역
function StoryReader({ title, pages, page, onPage, onClose, closeLabel = '돌아가기', children, guide, previewMode = false }) {
  const current = pages[page - 1];
  const [isGuideOpen, setIsGuideOpen] = useState(previewMode);
  const [isHintOpen, setIsHintOpen] = useState(false);
  const showPage = useCallback((next) => {
    setIsGuideOpen(false);
    setIsHintOpen(false);
    onPage(Math.min(pages.length, Math.max(1, next)));
  }, [onPage, pages.length]);
  const turn = usePageTurn(page, pages.map((item) => item.imageUrl));
  const pageGuide = guide && previewMode ? guideFor(guide, page, pages.length) : null;
  const prompt = guide?.prompts?.find((item) => item.afterPage === page);
  const hasGuideContent = Boolean(
    prompt?.question?.trim() || prompt?.parentHint?.trim()
    || (page === 1 && (guide?.beforeReading?.intent?.trim() || guide?.beforeReading?.tips?.some((tip) => tip?.trim())))
    || (page === pages.length && (guide?.afterReading?.bridgeQuestion?.trim() || guide?.afterReading?.ifUndecided?.trim())),
  );
  const guideLines = pageGuide?.talk?.split('\n').filter(Boolean) ?? [];

  useEffect(() => {
    const handleKeys = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') showPage(page - 1);
      if (event.key === 'ArrowRight') showPage(page + 1);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeys);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeys);
    };
  }, [onClose, page, pages.length, showPage]);

  useEffect(() => {
    if (!isHintOpen) return undefined;
    const timer = window.setTimeout(() => setIsHintOpen(false), 3500);
    return () => window.clearTimeout(timer);
  }, [isHintOpen]);

  if (!current) return null;

  const lines = current.text.split('\n').filter(Boolean);

  return (
    <section className={`${styles.reader} ${previewMode ? styles.previewReader : ''}`} aria-label="동화 읽기" aria-modal="true" role="dialog">
      <div className={styles.readerCanvas}>
        <header className={styles.readerHeader}>
          <button className={styles.readerClose} type="button" onClick={onClose} aria-label={closeLabel}>
            <img src={readerClose} alt="" />
          </button>
          <h1 className={styles.readerTitle}>{title}</h1>
          <div className={styles.readerProgress} aria-label={`${page} / ${pages.length}쪽`}>
            <span>{page} / {pages.length}</span>
            <div className={styles.readerProgressTrack}>
              <div className={styles.readerProgressFill} style={{ width: `${(page / pages.length) * 100}%` }} />
            </div>
          </div>
        </header>

        <div className={styles.readerBook}>
          <img className={styles.readerFrame} src={previewMode ? previewFrame : readerFrame} alt="" />
          <div className={styles.readerPage}>
            <div className={styles.readerPageContent}>
              <SafeImage
                src={current.imageUrl}
                alt={`${page}쪽 동화 삽화`}
                fallback={<p role="img" aria-label="그림 없음">그림을 아직 준비하지 못했어요.</p>}
              />
              {current.textBlocks == null ? (
                <div className={styles.readerCopy} data-position={textPositionOf(current)}>
                  {lines.map((line, index) => <p key={`${page}-${index}`}><StoryText text={line} /></p>)}
                </div>
              ) : <StoryTextBlocks blocks={current.textBlocks} />}
              <PageTurnOverlay turn={turn} />
            </div>
          </div>
        </div>

        {!previewMode && <button
          className={`${styles.readerArrow} ${styles.readerArrowLeft}`}
          type="button"
          onClick={() => showPage(page - 1)}
          disabled={page === 1}
          aria-label="이전 쪽"
        >
          <img src={readerArrowLeft} alt="" />
        </button>}
        {!previewMode && <button
          className={`${styles.readerArrow} ${styles.readerArrowRight}`}
          type="button"
          onClick={() => showPage(page + 1)}
          disabled={page === pages.length}
          aria-label="다음 쪽"
        >
          <img src={readerArrowRight} alt="" />
        </button>}

        {previewMode && (
          <>
            <nav className={styles.previewPagination} aria-label="동화 페이지">
              <button type="button" onClick={() => showPage(page - 1)} disabled={page === 1} aria-label="이전 쪽">
                <img src={page === 1 ? pageArrowInactive : pageArrowActive} alt="" />
              </button>
              <strong><span>{page}</span> / {pages.length}</strong>
              <button type="button" onClick={() => showPage(page + 1)} disabled={page === pages.length} aria-label="다음 쪽">
                <img src={page === pages.length ? pageArrowInactive : pageArrowActive} alt="" />
              </button>
            </nav>
            <aside className={`${styles.previewGuide} ${isGuideOpen && hasGuideContent ? styles.previewGuideOpen : ''}`}
              id="reader-guide" aria-hidden={!isGuideOpen || !hasGuideContent} inert={!isGuideOpen || !hasGuideContent}>
              <img className={styles.previewGuideBackground} src={guidePanelBackground} alt="" />
              <div className={styles.previewGuideContent}>
                <section>
                  <h2>이번 장면에서는</h2>
                  <p className={styles.previewGuideLead}>{pageGuide?.description}</p>
                  {guideLines[0] && <p className={styles.previewGuideDetail}><img src={guideHand} alt="" />{guideLines[0]}</p>}
                </section>
                <section>
                  <h2>아이가 대답할 때에는</h2>
                  {guideLines[1] && <p className={styles.previewGuideLead}>{guideLines[1]}</p>}
                  {guideLines.length > 2 && <p className={styles.previewGuideDetail}><img src={guideQuestion} alt="" />{guideLines.slice(2).join(' ')}</p>}
                </section>
              </div>
            </aside>
            <aside className={`${styles.previewHint} ${isHintOpen && !hasGuideContent ? styles.previewHintOpen : ''}`}
              id="reader-guide-hint" aria-hidden={!isHintOpen || hasGuideContent} inert={!isHintOpen || hasGuideContent}>
              {NO_GUIDE_MESSAGE}
            </aside>
            <button className={styles.previewGuideToggle} type="button"
              onClick={() => {
                if (hasGuideContent) {
                  setIsHintOpen(false);
                  setIsGuideOpen((open) => !open);
                } else if (guide) {
                  setIsHintOpen((open) => !open);
                }
              }}
              aria-label={hasGuideContent ? (isGuideOpen ? '설명창 닫기' : '설명창 열기') : '쪽 안내 보기'}
              aria-expanded={hasGuideContent ? isGuideOpen : isHintOpen}
              aria-controls={hasGuideContent ? 'reader-guide' : 'reader-guide-hint'}
              aria-disabled={!guide}>
              {isGuideOpen && hasGuideContent ? <>
                <img className={styles.previewToggleBackground} src={toggleBackground} alt="" />
                <img className={styles.previewToggleChevron} src={toggleChevron} alt="" />
              </> : <>
                <img className={styles.previewMascotBase} src={mascotBase} alt="" />
                <img className={styles.previewMascotFace} src={mascotFace} alt="" />
                {hasGuideContent && <img className={styles.previewGuideDot} src={guideDot} alt="" />}
              </>}
            </button>
          </>
        )}

        {children && <div className={styles.extra}>{children}</div>}
      </div>
    </section>
  );
}

export default StoryReader;
