import { useCallback, useEffect, useRef, useState } from 'react';
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
import { guideFor, NO_GUIDE_MESSAGE } from '../guideContent';
import { useFlipDrag } from '../hooks/useFlipDrag';
import GuideText from './GuideText';
import StoryFlipBook from './StoryFlipBook';
import styles from './StoryReader.module.css';

// 이만큼 안 움직이고 떼면 화면을 한 번 누른 것으로 봐요. (넘기려고 끌거나 쓸어 넘긴 것과 구분해요)
const TAP_MOVE_PX = 10;
// 아이와 읽기에서 상단바가 내려와 있는 시간이에요. 그 전에 다시 누르면 바로 올라가요.
const HEADER_VISIBLE_MS = 2000;

// 동화를 화면 가득 크게 읽는 화면이에요. 미리보기(확정 전)와 아이와 읽기(확정 후)가 함께 써요.
// pages: [{ pageNo, text, imageUrl, imageStatus }], page: 지금 쪽(1부터), children: 쪽 아래에 띄울 보조 영역
// frontCover·backCover: 아이와 읽기에서 맨 앞·맨 뒤에 붙일 앞표지·뒤표지 그림이에요. 둘 다 있으면 page 0이 앞표지, 마지막 쪽+1이 뒤표지예요.
function StoryReader({ title, pages, page, onPage, onClose, closeLabel = '돌아가기', children, guide, previewMode = false, className = '', suspended = false, keepHeaderShown = false, frontCover = null, backCover = null }) {
  const current = pages[page - 1];
  // 실제 책처럼 앞표지에서 시작해 뒤표지로 끝나요. (미리보기는 지금처럼 1쪽부터예요)
  const covers = !previewMode && Boolean(frontCover && backCover);
  const firstPage = covers ? 0 : 1;
  const lastPage = covers ? pages.length + 1 : pages.length;
  const coverLabel = covers && page === 0 ? '앞표지' : covers && page === pages.length + 1 ? '뒤표지' : null;
  const [closedGuidePage, setClosedGuidePage] = useState(null);
  const [isHintOpen, setIsHintOpen] = useState(false);
  // 아이와 읽기에서는 그림이 화면을 가득 채우고, 화면을 한 번 누르면 상단바가 내려와요.
  // 2초 뒤에 저절로 올라가고, 그 전에 다시 누르면 바로 올라가요. 미리보기에서는 상단바가 항상 떠 있어요.
  const [isHeaderShown, setIsHeaderShown] = useState(false);
  // 상단바를 다시 내리거나 포커스가 상단바를 떠날 때 2초를 처음부터 다시 세려고 올리는 값이에요.
  const [headerTimerKey, setHeaderTimerKey] = useState(0);
  const headerRef = useRef(null);
  const tapStart = useRef(null);
  // 누른 곳이 앞표지(누르면 열리는 곳)인지예요.
  const tapOnCover = useRef(false);
  const bookRef = useRef(null);
  const [portrait, setPortrait] = useState(() => window.matchMedia('(max-width: 760px)').matches);
  const singlePage = previewMode && portrait;
  const [devicePortrait, setDevicePortrait] = useState(() => window.matchMedia('(orientation: portrait)').matches);
  const showRotateGuide = !previewMode && portrait && devicePortrait;
  // 책장이 넘어가는 중인지예요. 다 넘어가기 전에는 다음·이전 쪽으로 가지 않아요. (연속으로 눌러도 한 장씩 넘어가요)
  const [turning, setTurning] = useState(false);
  const turningRef = useRef(false);
  const handleTurningChange = useCallback((value) => {
    turningRef.current = value;
    setTurning(value);
  }, []);
  // 쪽이 바뀌면 책이 그 쪽으로 책장을 넘겨요.
  const showPage = useCallback((next) => {
    if (turningRef.current) return;
    const target = Math.min(lastPage, Math.max(firstPage, next));
    if (target === page) return;
    setClosedGuidePage(null);
    setIsHintOpen(false);
    // 책이 넘어가기 시작했다고 알려주기(다음 그림) 전에 또 누르면 두 장이 넘어가서, 누른 순간 바로 막아요.
    // (책이 다 넘어가 멈추면 StoryFlipBook이 onTurningChange(false)로 풀어줘요)
    turningRef.current = true;
    setTurning(true);
    onPage(target);
  }, [onPage, page, firstPage, lastPage]);
  // 손으로 끌어 넘긴 뒤 책이 알려준 쪽이에요.
  const handleBookPage = useCallback((next) => {
    setClosedGuidePage(null);
    setIsHintOpen(false);
    onPage(next);
  }, [onPage]);
  const pageGuide = guide && previewMode ? guideFor(guide, page, pages.length) : null;
  // 아이와 읽기에서는 책장을 누른 채 끌어서도 넘겨요. 미리보기는 아래 화살표로만 넘어가요.
  const flipDrag = useFlipDrag(bookRef, {
    canPrev: !turning && page > firstPage,
    canNext: !turning && page < lastPage,
    // 넓은 화면에서 표지를 펼치고 덮는 건(앞표지 ↔ 1쪽, 마지막 쪽 ↔ 뒤표지) 책장을 끌지 않고 쓸어 넘기면 표지 움직임으로 넘어가요.
    swipePrev: covers && !singlePage && (page === 1 || page === lastPage),
    swipeNext: covers && !singlePage && (page === 0 || page === pages.length),
    onSwipe: (forward) => showPage(page + (forward ? 1 : -1)),
  });
  const prompt = guide?.prompts?.find((item) => item.afterPage === page);
  const hasGuideContent = Boolean(
    prompt?.sceneNote?.trim() || prompt?.question?.trim() || prompt?.parentHint?.trim()
    || (page === 1 && (guide?.beforeReading?.intent?.trim() || guide?.beforeReading?.tips?.some((tip) => tip?.trim())))
    || (page === pages.length && (guide?.afterReading?.bridgeQuestion?.trim() || guide?.afterReading?.ifUndecided?.trim())),
  );
  const isGuideOpen = hasGuideContent && closedGuidePage !== page;

  useEffect(() => {
    const query = window.matchMedia('(max-width: 760px)');
    const update = () => setPortrait(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const query = window.matchMedia('(orientation: portrait)');
    const update = () => setDevicePortrait(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const handleKeys = (event) => {
      if (suspended) return;
      // 키보드로 움직이면 닫기 버튼에 갈 수 있게 상단바를 내려요.
      if (event.key === 'Tab' && !previewMode) {
        setIsHeaderShown(true);
        setHeaderTimerKey((key) => key + 1);
      }
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
  }, [onClose, page, pages.length, previewMode, showPage, suspended]);

  useEffect(() => {
    if (!isHintOpen) return undefined;
    const timer = window.setTimeout(() => setIsHintOpen(false), 3500);
    return () => window.clearTimeout(timer);
  }, [isHintOpen]);

  useEffect(() => {
    if (previewMode || keepHeaderShown || !isHeaderShown) return undefined;
    const timer = window.setTimeout(() => {
      // 키보드로 닫기 버튼에 가 있는 동안에는 올리지 않아요.
      if (!headerRef.current?.contains(document.activeElement)) setIsHeaderShown(false);
    }, HEADER_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [previewMode, keepHeaderShown, isHeaderShown, headerTimerKey]);

  if (!current && !coverLabel) return null;

  const isHeaderHidden = !previewMode && !keepHeaderShown && !isHeaderShown;

  // 버튼을 뺀 화면 어디든 한 번 누르면 상단바가 내려오거나 올라가요. (내려오면 2초 뒤 저절로 올라가요)
  // 책장 라이브러리가 터치를 막아 click이 오지 않아서, 누르고 뗀 위치로 직접 판단해요.
  const handlePointerDown = (event) => {
    tapStart.current = event.target.closest('button') ? null : { x: event.clientX, y: event.clientY };
    tapOnCover.current = Boolean(event.target.closest('[data-openable]'));
  };
  const handlePointerUp = (event) => {
    const start = tapStart.current;
    const onCover = tapOnCover.current;
    tapStart.current = null;
    tapOnCover.current = false;
    if (previewMode || !start) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > TAP_MOVE_PX) return;
    // 마우스를 올릴 수 없는 태블릿·휴대폰에서도 앞표지를 한 번 누르면 책이 열려요. (상단바는 그대로예요)
    if (onCover && page === 0) {
      showPage(1);
      return;
    }
    // 표지 양옆의 서재 배경을 누르면 해당 방향으로 이동해요.
    if (coverLabel) {
      const side = page === 0 ? 'front' : 'back';
      const cover = bookRef.current?.host()?.querySelector(`[data-side="${side}"] .${styles.coverBook}`);
      const bounds = cover?.getBoundingClientRect();
      if (bounds && event.clientY >= bounds.top && event.clientY <= bounds.bottom) {
        if (event.clientX < bounds.left) {
          showPage(page - 1);
          return;
        }
        if (event.clientX > bounds.right) {
          showPage(page + 1);
          return;
        }
      }
    }
    // 펼쳐진 책은 양옆을 누르면 넘기고, 가운데를 누르면 상단바를 열거나 닫아요.
    if (!coverLabel && bookRef.current?.host()?.contains(event.target)) {
      const bounds = bookRef.current.host().getBoundingClientRect();
      const relativeX = (event.clientX - bounds.left) / bounds.width;
      if (relativeX < 1 / 3 || relativeX > 2 / 3) {
        showPage(page + (relativeX < 1 / 3 ? -1 : 1));
        return;
      }
    }
    // 책장 모서리를 눌러 넘기기 시작했으면 상단바는 그대로 둬요.
    setTimeout(() => {
      const state = bookRef.current?.pageFlip()?.getState();
      if (!state || state === 'read') {
        setIsHeaderShown((shown) => !shown);
        setHeaderTimerKey((key) => key + 1);
      }
    }, 0);
  };

  return (
    <section
      className={`${styles.reader} ${previewMode ? styles.previewReader : ''} ${className}`}
      inert={suspended}
      data-header-hidden={isHeaderHidden}
      data-rotate-guide={showRotateGuide || undefined}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      aria-label="동화 읽기"
      aria-modal="true"
      role="dialog"
    >
      <header
        className={styles.readerHeader}
        ref={headerRef}
        onBlur={previewMode ? undefined : () => setHeaderTimerKey((key) => key + 1)}
      >
        <button className={styles.readerClose} type="button" onClick={onClose} aria-label={closeLabel} data-close-hit-area>
          <img src={readerClose} alt="" />
        </button>
        <h1 className={styles.readerTitle}>{title}</h1>
        <div className={styles.readerProgress} aria-label={coverLabel ?? `${page} / ${pages.length}쪽`}>
          <span>{coverLabel ?? `${page} / ${pages.length}`}</span>
          <div className={styles.readerProgressTrack}>
            <div className={styles.readerProgressFill} style={{ width: `${(Math.min(Math.max(page, 0), pages.length) / pages.length) * 100}%` }} />
          </div>
        </div>
      </header>

      <div className={styles.readerCanvas}>
        <div className={styles.readerBook}>
          <img className={styles.readerFrame} src={previewMode ? previewFrame : readerFrame} alt="" />
          <div className={styles.readerPage}>
            <StoryFlipBook
              ref={bookRef}
              pages={pages}
              page={page}
              onPage={handleBookPage}
              onTurningChange={handleTurningChange}
              portrait={singlePage}
              seamless={!previewMode}
              frontCover={covers ? frontCover : null}
              backCover={covers ? backCover : null}
              {...(previewMode ? {} : flipDrag)}
            />
          </div>
        </div>

        {!previewMode && <button
          className={`${styles.readerArrow} ${styles.readerArrowLeft}`}
          type="button"
          onClick={() => showPage(page - 1)}
          disabled={page === firstPage}
          // 넘어가는 동안에는 누를 수 없어요. (disabled로 바꾸면 키보드 포커스가 빠져서 aria-disabled로 막아요)
          aria-disabled={turning || undefined}
          aria-label="이전 쪽"
        >
          <img src={readerArrowLeft} alt="" />
        </button>}
        {!previewMode && <button
          className={`${styles.readerArrow} ${styles.readerArrowRight}`}
          type="button"
          onClick={() => showPage(page + 1)}
          disabled={page === lastPage}
          aria-disabled={turning || undefined}
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
                  {pageGuide?.description && <p className={styles.previewGuideLead}><GuideText text={pageGuide.description} /></p>}
                  {pageGuide?.scene && <p className={styles.previewGuideDetail}><img src={guideHand} alt="" /><GuideText text={pageGuide.scene} /></p>}
                </section>
                <section>
                  <h2>아이가 대답할 때에는</h2>
                  {pageGuide?.hint && <p className={styles.previewGuideLead}><GuideText text={pageGuide.hint} /></p>}
                  {pageGuide?.question && <p className={styles.previewGuideDetail}><img src={guideQuestion} alt="" /><GuideText text={pageGuide.question} /></p>}
                </section>
              </div>
            </aside>
            <aside className={`${styles.previewHint} ${isHintOpen && !hasGuideContent ? styles.previewHintOpen : ''}`}
              id="reader-guide-hint" aria-hidden={!isHintOpen || hasGuideContent} inert={!isHintOpen || hasGuideContent}>
              {NO_GUIDE_MESSAGE}
            </aside>
            <button className={`${styles.previewGuideToggle} ${hasGuideContent && !isGuideOpen ? styles.previewGuideToggleAttention : ''}`} type="button"
              onClick={() => {
                if (hasGuideContent) {
                  setIsHintOpen(false);
                  setClosedGuidePage(isGuideOpen ? page : null);
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
              </>}
            </button>
          </>
        )}

        {children && <div className={styles.extra}>{children}</div>}
      </div>
      {showRotateGuide && (
        <div className={styles.rotateBackdrop}>
          <div className={styles.rotateDialog} role="status" aria-live="polite">
            <div className={styles.rotateIcon} aria-hidden="true"><span /></div>
            <h2>휴대폰을 가로로 돌려주세요</h2>
            <p>가로 화면에서 동화 그림과 글을<br />한눈에 볼 수 있어요.</p>
            <button type="button" onClick={onClose}>읽기 닫기</button>
          </div>
        </div>
      )}
    </section>
  );
}

export default StoryReader;
