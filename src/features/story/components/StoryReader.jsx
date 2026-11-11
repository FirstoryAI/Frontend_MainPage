import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
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
import StoryFlipPage from './StoryFlipPage';
import styles from './StoryReader.module.css';

// 이만큼 안 움직이고 떼면 화면을 한 번 누른 것으로 봐요. (넘기려고 끌거나 쓸어 넘긴 것과 구분해요)
const TAP_MOVE_PX = 10;
// 아이와 읽기에서 상단바가 내려와 있는 시간이에요. 그 전에 다시 누르면 바로 올라가요.
const HEADER_VISIBLE_MS = 2000;
const pageIndexFor = (number, portrait) => (number - 1) * (portrait ? 1 : 2);

// 동화를 화면 가득 크게 읽는 화면이에요. 미리보기(확정 전)와 아이와 읽기(확정 후)가 함께 써요.
// pages: [{ pageNo, text, imageUrl, imageStatus }], page: 지금 쪽(1부터), children: 쪽 아래에 띄울 보조 영역
function StoryReader({ title, pages, page, onPage, onClose, closeLabel = '돌아가기', children, guide, previewMode = false, className = '' }) {
  const current = pages[page - 1];
  const [closedGuidePage, setClosedGuidePage] = useState(null);
  const [isHintOpen, setIsHintOpen] = useState(false);
  // 아이와 읽기에서는 그림이 화면을 가득 채우고, 화면을 한 번 누르면 상단바가 내려와요.
  // 2초 뒤에 저절로 올라가고, 그 전에 다시 누르면 바로 올라가요. 미리보기에서는 상단바가 항상 떠 있어요.
  const [isHeaderShown, setIsHeaderShown] = useState(false);
  // 상단바를 다시 내리거나 포커스가 상단바를 떠날 때 2초를 처음부터 다시 세려고 올리는 값이에요.
  const [headerTimerKey, setHeaderTimerKey] = useState(0);
  const headerRef = useRef(null);
  const tapStart = useRef(null);
  const bookRef = useRef(null);
  const pageAreaRef = useRef(null);
  const pageRef = useRef(page);
  const onPageRef = useRef(onPage);
  const [pageArea, setPageArea] = useState(null);
  const [portrait, setPortrait] = useState(() => window.matchMedia('(max-width: 760px)').matches);
  const portraitRef = useRef(portrait);
  const bookPages = useMemo(() => pages.flatMap((item, index) => (
    portrait
      ? [<StoryFlipPage key={`${index}-single`} storyPage={item} pageNumber={index + 1} portrait />]
      : [
        <StoryFlipPage key={`${index}-left`} storyPage={item} pageNumber={index + 1} side="left" />,
        <StoryFlipPage key={`${index}-right`} storyPage={item} pageNumber={index + 1} side="right" />,
      ]
  )), [pages, portrait]);
  const showPage = useCallback((next) => {
    const target = Math.min(pages.length, Math.max(1, next));
    if (target === page) return;
    setClosedGuidePage(null);
    setIsHintOpen(false);
    const book = bookRef.current?.pageFlip();
    if (book) book.flip(pageIndexFor(target, portrait));
    else onPage(target);
  }, [onPage, page, pages.length, portrait]);
  const handleFlip = useCallback((event) => {
    const next = Math.floor(event.data / (portraitRef.current ? 1 : 2)) + 1;
    if (next === pageRef.current) return;
    setClosedGuidePage(null);
    setIsHintOpen(false);
    onPageRef.current(next);
  }, []);
  const pageGuide = guide && previewMode ? guideFor(guide, page, pages.length) : null;
  // 책장은 누른 채 끌어야 넘어가요. 미리보기에서는 쪽을 누르면 누른 쪽으로 넘어가요.
  const flipDrag = useFlipDrag(bookRef, {
    onTap: previewMode ? (event) => {
      const box = pageAreaRef.current?.getBoundingClientRect();
      if (box) showPage(event.clientX < box.left + box.width / 2 ? page - 1 : page + 1);
    } : undefined,
  });

  useEffect(() => {
    pageRef.current = page;
    onPageRef.current = onPage;
    portraitRef.current = portrait;
  }, [page, onPage, portrait]);
  const prompt = guide?.prompts?.find((item) => item.afterPage === page);
  const hasGuideContent = Boolean(
    prompt?.sceneNote?.trim() || prompt?.question?.trim() || prompt?.parentHint?.trim()
    || (page === 1 && (guide?.beforeReading?.intent?.trim() || guide?.beforeReading?.tips?.some((tip) => tip?.trim())))
    || (page === pages.length && (guide?.afterReading?.bridgeQuestion?.trim() || guide?.afterReading?.ifUndecided?.trim())),
  );
  const isGuideOpen = hasGuideContent && closedGuidePage !== page;

  useEffect(() => {
    const area = pageAreaRef.current;
    if (!area) return undefined;
    const measure = () => {
      const { width, height } = area.getBoundingClientRect();
      setPageArea((old) => old?.width === Math.round(width) && old?.height === Math.round(height)
        ? old : { width: Math.round(width), height: Math.round(height) });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(area);
    measure();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 760px)');
    const update = () => setPortrait(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const book = bookRef.current?.pageFlip();
    if (book && Math.floor(book.getCurrentPageIndex() / (portrait ? 1 : 2)) + 1 !== page) {
      book.turnToPage(pageIndexFor(page, portrait));
    }
  }, [page, portrait, pageArea]);

  useEffect(() => {
    const handleKeys = (event) => {
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
  }, [onClose, page, pages.length, previewMode, showPage]);

  useEffect(() => {
    if (!isHintOpen) return undefined;
    const timer = window.setTimeout(() => setIsHintOpen(false), 3500);
    return () => window.clearTimeout(timer);
  }, [isHintOpen]);

  useEffect(() => {
    if (previewMode || !isHeaderShown) return undefined;
    const timer = window.setTimeout(() => {
      // 키보드로 닫기 버튼에 가 있는 동안에는 올리지 않아요.
      if (!headerRef.current?.contains(document.activeElement)) setIsHeaderShown(false);
    }, HEADER_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [previewMode, isHeaderShown, headerTimerKey]);

  if (!current) return null;

  const isHeaderHidden = !previewMode && !isHeaderShown;

  // 버튼을 뺀 화면 어디든 한 번 누르면 상단바가 내려오거나 올라가요. (내려오면 2초 뒤 저절로 올라가요)
  // 책장 라이브러리가 터치를 막아 click이 오지 않아서, 누르고 뗀 위치로 직접 판단해요.
  const handlePointerDown = (event) => {
    tapStart.current = event.target.closest('button') ? null : { x: event.clientX, y: event.clientY };
  };
  const handlePointerUp = (event) => {
    const start = tapStart.current;
    tapStart.current = null;
    if (previewMode || !start) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > TAP_MOVE_PX) return;
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
      data-header-hidden={isHeaderHidden}
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

      <div className={styles.readerCanvas}>
        <div className={styles.readerBook}>
          <img className={styles.readerFrame} src={previewMode ? previewFrame : readerFrame} alt="" />
          <div className={styles.readerPage}>
            <div
              className={styles.flipHost}
              ref={pageAreaRef}
              {...flipDrag}
              // 펼친 두 쪽이 만나는 경계(소수점 픽셀)에 바탕이 비쳐 세로줄처럼 보이지 않게, 같은 그림을 뒤에 깔아요.
              style={!portrait && current.imageUrl ? { backgroundImage: `url("${current.imageUrl}")` } : undefined}
            >
              {pageArea?.width > 0 && pageArea?.height > 0 && (
                <HTMLFlipBook
                  key={portrait ? 'portrait' : 'spread'}
                  ref={bookRef}
                  className={styles.flipBook}
                  // 화면 폭이 홀수여도 두 쪽 사이에 틈(밝은 세로줄)이 생기지 않게 올림해요. 넘친 1px은 가려져요.
                  width={portrait ? pageArea.width : Math.ceil(pageArea.width / 2)}
                  height={pageArea.height}
                  size="fixed"
                  startPage={pageIndexFor(page, portrait)}
                  usePortrait={portrait}
                  showCover={false}
                  drawShadow
                  maxShadowOpacity={0.35}
                  flippingTime={720}
                  mobileScrollSupport={false}
                  useMouseEvents={false}
                  onFlip={handleFlip}
                >
                  {bookPages}
                </HTMLFlipBook>
              )}
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
                  {pageGuide?.description && <p className={styles.previewGuideLead}>{pageGuide.description}</p>}
                  {pageGuide?.scene && <p className={styles.previewGuideDetail}><img src={guideHand} alt="" />{pageGuide.scene}</p>}
                </section>
                <section>
                  <h2>아이가 대답할 때에는</h2>
                  {pageGuide?.hint && <p className={styles.previewGuideLead}>{pageGuide.hint}</p>}
                  {pageGuide?.question && <p className={styles.previewGuideDetail}><img src={guideQuestion} alt="" />{pageGuide.question}</p>}
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
    </section>
  );
}

export default StoryReader;
