import { forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import CoverFace from './CoverFace';
import StoryFlipPage from './StoryFlipPage';
import { ActivePageContext } from '../activePageContext';
import { FLIP_MS, flipDistance } from '../flipTiming';
import styles from './StoryReader.module.css';

// 넘김(최대: 작은 화면의 책장 넘김, 표지 펼치기·덮기 1.7초)이 이 시간 안에 끝나지 않으면 멈춘 것으로 봐요.
const TURN_TIMEOUT_MS = 3000;
// 라이브러리(page-flip)는 책장이 움직이는 거리가 1000px보다 짧으면 그만큼 빨리 넘겨요. (거리/1000 × flippingTime)
// 그래서 휴대폰처럼 책이 작으면 더 빨리 넘어갔어요. 거리가 짧은 만큼 flippingTime을 늘려서 시간을 맞춰요.
// 거리는 라이브러리 계산과 같아요: 책장 폭 × 2 − 책 높이 / 10 (flipTiming.js)
const flippingTimeFor = (pageWidth, height) => {
  const distance = flipDistance(pageWidth, height);
  return distance > 0 ? Math.round(FLIP_MS * Math.max(1, 1000 / distance)) : FLIP_MS;
};

// 쪽 번호(page)와 라이브러리의 책장 번호(index)를 서로 바꿔요.
//  - 넓은 화면은 그림 한 장이 두 책장(왼쪽·오른쪽 절반)이고, portrait는 한 책장이에요.
//  - 앞·뒤표지가 있으면 page 0이 앞표지, page count+1이 뒤표지예요. 표지는 한 책장이에요.
const pageIndexFor = (page, portrait, covers, count) => {
  if (portrait) return covers ? page : page - 1;
  if (!covers) return (page - 1) * 2;
  if (page <= 0) return 0;
  if (page > count) return count * 2 + 1;
  return 1 + (page - 1) * 2;
};
const pageNumberFor = (index, portrait, covers, count) => {
  if (portrait) return covers ? index : index + 1;
  if (!covers) return Math.floor(index / 2) + 1;
  if (index <= 0) return 0;
  if (index > count * 2) return count + 1;
  return Math.floor((index - 1) / 2) + 1;
};

// 넓은 화면(두 쪽 펼침)에서 앞·뒤표지 정사각형은 한 면(폭·높이 중 짧은 쪽)의 80%이고, 옆·아래로 책 두께(종이 단면)가 정사각형의 2.2%만큼 보여요.
// (CSS .coverBook의 --s·--edge와 같아요. 한 쪽씩 보는 화면은 94%예요)
const COVER_SCALE = 0.8;
const COVER_EDGE = 0.022;

// 앞표지·뒤표지 한 면이에요. 탁자에 놓인 실제 그림책처럼 서재 표지와 같은 정사각형에 책 두께(종이 단면)·책등 주름·빛·그림자를 그려요.
// 앞표지는 책의 오른쪽 면이라 왼쪽(책등)에, 뒤표지는 왼쪽 면이라 오른쪽(책등)에 붙어요. 둘레는 비워서 뒤의 서재 벽이 보여요.
const StoryCoverPage = forwardRef(function StoryCoverPage({ src, label, side, portrait, lastPage }, ref) {
  const activePage = useContext(ActivePageContext);
  const nearCover = side === 'front' ? activePage <= 1 : activePage >= lastPage - 1;
  const currentCover = side === 'front' ? activePage === 0 : activePage === lastPage;
  return (
    <div className={`${styles.flipPage} ${styles.coverPage}`} ref={ref} data-density="hard">
      {/* 라이브러리가 책장 요소의 display를 바꿔서, 가운데 맞춤은 안쪽 틀에서 해요. */}
      <CoverFace src={src} label={label} side={side} portrait={portrait}
        loading={nearCover ? 'eager' : 'lazy'} fetchPriority={currentCover ? 'high' : 'low'}
        openable={side === 'front'} />
    </div>
  );
});

// 표지를 펼치고 덮는 움직임(Motion 라이브러리)은 아이와 읽기에서만 써서, 처음 쓸 때 따로 받아요. (홈 첫 화면 번들에는 들어가지 않아요)
// React.lazy + Suspense로 그리면, 코드를 미리 받아 둬도 처음 그릴 때 한 번은 기다림(fallback)으로 처리되고
// React가 그 화면을 최소 300ms 붙잡아 둬서 책을 처음 펼칠 때 0.3초 멈췄어요. (#220)
// 그래서 받은 컴포넌트를 모듈 변수에 넣어 두고, 있으면 바로 그려요.
let loadedCoverMotion = null;
let coverMotionRequest = null;
const loadCoverMotion = () => {
  coverMotionRequest ??= import('./CoverMotion')
    .then((module) => {
      loadedCoverMotion = module.default;
      return loadedCoverMotion;
    })
    .catch((error) => {
      // 받지 못했으면 다음에 다시 받아 볼 수 있게 비워 둬요.
      coverMotionRequest = null;
      throw error;
    });
  return coverMotionRequest;
};

// 책을 처음 펼칠 때 큰 그림을 처음 푸는(디코딩) 시간이 움직임에 겹치지 않게, 표지·첫 쪽·마지막 쪽 그림을 미리 풀어 둬요. (#220)
// 푼 그림을 들고 있어야 브라우저가 풀어 둔 결과를 버리지 않아서, 최근 몇 장만 붙잡아 둬요.
const decodedImages = new Map();
const decodeAhead = (urls) => {
  urls.filter(Boolean).forEach((url) => {
    if (decodedImages.has(url)) return;
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    image.decode?.().catch(() => {});
    decodedImages.set(url, image);
    if (decodedImages.size > 8) decodedImages.delete(decodedImages.keys().next().value);
  });
};

// 움직임 코드를 아직 받는 중이면, 덮인 표지를 그대로 보여주고 뒤의 쪽은 숨겨 둬요. (받는 대로 CoverMotion이 이어서 움직여요)
function CoverMotionPending({ kind, src, pageWidth, shift, slideRef }) {
  useLayoutEffect(() => {
    const slide = slideRef.current;
    if (!slide) return undefined;
    slide.style.opacity = '0';
    return () => {
      slide.style.opacity = '';
    };
  }, [slideRef]);
  const front = kind === 'open';
  return (
    <div className={styles.coverMotion} data-kind={kind} style={{ '--page-w': `${pageWidth}px` }} aria-hidden="true">
      <div className={styles.coverLeafStage}>
        <div className={styles.coverLeaf} style={{ transform: `translateX(${front ? -shift : shift}px)` }}>
          <div className={styles.coverLeafFace}>
            <CoverFace src={src} label="" side={front ? 'front' : 'back'} />
          </div>
        </div>
      </div>
    </div>
  );
}

// 책장 넘김 효과가 있는 동화책이에요. 아이와 읽기, 크게 보기, 미리보기가 함께 써요.
//  - page가 바뀌면 그 쪽으로 책장을 넘겨요. 손으로 끌어 넘기면 onPage로 알려줘요.
//  - 넓은 화면에서는 그림 한 장을 펼친 두 쪽(왼쪽·오른쪽 절반)으로 나눠 보여줘요. portrait면 한 쪽씩이에요.
//  - frontCover·backCover가 둘 다 있으면 실제 책처럼 맨 앞에 앞표지, 맨 뒤에 뒤표지가 한 면씩 붙어요. (page 0, count+1)
//    넓은 화면에서 표지는 덮인 책처럼 화면 가운데에 놓이고, 펼치면 책이 옆으로 밀리며 두 쪽이 보여요.
//  - seamless: 쪽 바탕을 비우고 지금 그림을 뒤에 깔아서, 두 쪽이 만나는 곳(소수점 픽셀)에 밝은 세로줄이 보이지 않게 해요.
//  - 마우스·터치로 넘기는 처리는 라이브러리에서 꺼 뒀어요. 끌어서 넘기려면 useFlipDrag 핸들러를 넘겨줘요.
// pages: [{ pageNo, text, textBlocks, imageUrl, imageNote? }], copyClassName·fallbackClassName: 글 상자·그림 없음 안내 모양
// onTurningChange(turning): 책장(또는 표지)이 넘어가기 시작하면 true, 다 넘어가 멈추면 false로 알려줘요.
// ref로 pageFlip()(라이브러리)과 host()(책을 담은 칸)를 꺼낼 수 있어요.
const StoryFlipBook = forwardRef(function StoryFlipBook({
  pages,
  page,
  onPage,
  onTurningChange,
  portrait = false,
  seamless = false,
  frontCover = null,
  backCover = null,
  copyClassName,
  fallbackClassName,
  className = '',
  ...hostProps
}, ref) {
  const bookRef = useRef(null);
  const hostRef = useRef(null);
  const pageRef = useRef(page);
  const onPageRef = useRef(onPage);
  const layoutRef = useRef({ portrait, covers: false, count: pages.length });
  // page가 바뀌어 넘기는 중인 목표 쪽이에요. 그 사이에 오는 넘김 알림은 무시해요.
  const pendingRef = useRef(null);
  const [area, setArea] = useState(null);
  const covers = Boolean(frontCover && backCover);
  const count = pages.length;
  const current = pages[page - 1];
  const pageWidth = area ? (portrait ? area.width : Math.ceil(area.width / 2)) : 0;
  // 책장이 다 넘어가 멈춘 쪽(책이 지금 머물러 있는 쪽)이에요.
  const [restingPage, setRestingPage] = useState(page);
  // 표지를 펼치거나 덮는 중인지(머물던 쪽과 가려는 쪽이 앞표지↔1쪽, 마지막 쪽↔뒤표지인지)예요. 넓은 화면에서만 따로 움직여요.
  const coverStep = covers && !portrait && area && restingPage !== page
    && ((restingPage === 0 && page === 1) || (restingPage === 1 && page === 0)
      || (restingPage === count && page === count + 1) || (restingPage === count + 1 && page === count));
  const motionKind = coverStep ? (page <= 1 && restingPage <= 1 ? 'open' : 'close') : null;
  // 앞표지 → 1쪽, 뒤표지 → 마지막 쪽은 처음부터 쪽을 깔아 두고, 반대 방향은 움직임이 끝난 뒤에 표지로 바꿔요.
  const turnFirst = coverStep && (restingPage === 0 || restingPage === count + 1);
  // 표지 움직임이 도는 중인지예요. 그 사이 라이브러리가 보내는 '멈춤' 알림이 머문 쪽을 바꿔 움직임을 끊고 책장을 한 번 더 넘기지 않게 써요.
  const motionRunningRef = useRef(false);
  // 가려는 쪽에 아직 멈추지 않았으면 넘어가는 중이에요.
  const turning = restingPage !== page;
  const onTurningChangeRef = useRef(onTurningChange);
  useLayoutEffect(() => {
    motionRunningRef.current = Boolean(motionKind);
  }, [motionKind]);

  useImperativeHandle(ref, () => ({
    pageFlip: () => bookRef.current?.pageFlip?.(),
    host: () => hostRef.current,
  }), []);

  const bookPages = useMemo(() => {
    const storyPages = pages.flatMap((item, index) => {
      const common = { storyPage: item, pageNumber: index + 1, copyClassName, fallbackClassName };
      return portrait
        ? [<StoryFlipPage key={`${index}-single`} {...common} portrait />]
        : [
          <StoryFlipPage key={`${index}-left`} {...common} side="left" />,
          <StoryFlipPage key={`${index}-right`} {...common} side="right" />,
        ];
    });
    if (!covers) return storyPages;
    return [
      <StoryCoverPage key="front-cover" src={frontCover} label="앞표지" side="front" portrait={portrait} lastPage={count + 1} />,
      ...storyPages,
      <StoryCoverPage key="back-cover" src={backCover} label="뒤표지" side="back" portrait={portrait} lastPage={count + 1} />,
    ];
  }, [pages, portrait, covers, frontCover, backCover, count, copyClassName, fallbackClassName]);

  // 두 쪽을 펼친 그림의 가로 대비 세로예요. 표지 안쪽·열리는 표지 뒤에 첫 쪽 그림을 같은 크기로 깔 때 써요.
  const spreadRatio = area && pageWidth ? area.height / (pageWidth * 2) : 0.6;

  useEffect(() => {
    pageRef.current = page;
    onPageRef.current = onPage;
    onTurningChangeRef.current = onTurningChange;
    layoutRef.current = { portrait, covers, count };
  }, [page, onPage, onTurningChange, portrait, covers, count]);

  // 넘어가는 중인지 알려줘요. 쪽이 바뀔 때마다도 알려줘서, StoryReader가 누른 순간 미리 막아 둔 것을 책 상태에 맞춰 풀어요.
  useEffect(() => {
    onTurningChangeRef.current?.(turning);
    if (!turning) return undefined;
    // 멈춤 알림이 오지 않는 드문 경우에도 계속 넘어가는 중으로 남지 않게, 넉넉히 기다린 뒤 지금 쪽에 멈춘 것으로 봐요.
    const timer = window.setTimeout(() => setRestingPage(pageRef.current), TURN_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [turning, page]);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    // 화면에 맞춰 장면을 줄인 미리보기(transform: scale)에서도 줄이기 전 크기로 재요.
    // (줄어든 크기로 재면 책이 한 번 더 작아져 뒤에 깐 그림과 이중으로 보여요)
    const measure = () => {
      const width = host.offsetWidth;
      const height = host.offsetHeight;
      setArea((old) => (old?.width === Math.round(width) && old?.height === Math.round(height)
        ? old : { width: Math.round(width), height: Math.round(height) }));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    measure();
    return () => observer.disconnect();
  }, []);

  // page가 바뀌면 그 쪽으로 넘겨요. 멀리 떨어진 쪽이어도 한 번에 넘어가요.
  useEffect(() => {
    const book = bookRef.current?.pageFlip?.();
    if (!book) return;
    // 표지를 펼치고 덮는 건 CoverMotion이 움직여요. 책은 넘기지 않고 쪽만 바꿔 둬요.
    if (motionKind) {
      if (turnFirst) book.turnToPage(pageIndexFor(page, portrait, covers, count));
      pendingRef.current = null;
      return;
    }
    if (pageNumberFor(book.getCurrentPageIndex(), portrait, covers, count) === page) {
      pendingRef.current = null;
      return;
    }
    pendingRef.current = page;
    book.flip(pageIndexFor(page, portrait, covers, count));
    // 넘김이 시작되지 않았으면 바로 그 쪽을 보여줘요.
    if (book.getState() === 'read') {
      book.turnToPage(pageIndexFor(page, portrait, covers, count));
      pendingRef.current = null;
      // 넘기지 않고 바로 바꾸면 멈춤 알림(onChangeState)이 오지 않아서, 다음 그림 때 멈춘 쪽을 맞춰요.
      requestAnimationFrame(() => {
        if (!motionRunningRef.current) setRestingPage(pageRef.current);
      });
    }
  }, [page, portrait, covers, count, area, motionKind, turnFirst]);

  // 펼치고 덮는 동안 책(쪽)이 나타나고 사라지는 건 CoverMotion이 이 틀의 투명도·크기를 바꿔요.
  const slideRef = useRef(null);
  // 표지가 있는 책을 넓은 화면으로 보면, 표지를 펼치기 전에 움직임 코드를 미리 받아 둬요.
  const [CoverMotion, setCoverMotion] = useState(() => loadedCoverMotion);
  useEffect(() => {
    if (!covers || portrait || CoverMotion) return undefined;
    let alive = true;
    loadCoverMotion()
      .then((component) => {
        if (alive) setCoverMotion(() => component);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [covers, portrait, CoverMotion]);
  const firstImage = pages[0]?.imageUrl;
  const lastImage = pages[count - 1]?.imageUrl;
  useEffect(() => {
    if (covers && !portrait) decodeAhead([frontCover, firstImage, lastImage, backCover]);
  }, [covers, portrait, frontCover, firstImage, lastImage, backCover]);

  // 표지 움직임이 끝나면 책을 가려던 쪽에 두고 멈춰요.
  const finishCoverMotion = () => {
    // 같은 움직임의 끝 알림이 두 번 와도 한 번만 처리해요.
    if (!motionRunningRef.current) return;
    motionRunningRef.current = false;
    const target = page;
    bookRef.current?.pageFlip?.()?.turnToPage(pageIndexFor(target, portrait, covers, count));
    // 라이브러리는 바뀐 쪽을 다음 그림(프레임)에 그려요. 그 전에 움직임을 걷으면 한 프레임 동안 이전 쪽이 화면 가득 번쩍여서,
    // 두 프레임 뒤(라이브러리가 표지를 그린 뒤)에 움직임을 걷어요.
    requestAnimationFrame(() => requestAnimationFrame(() => setRestingPage(target)));
  };

  const handleFlip = useCallback((event) => {
    const layout = layoutRef.current;
    const next = pageNumberFor(event.data, layout.portrait, layout.covers, layout.count);
    if (pendingRef.current != null) {
      if (next === pendingRef.current) pendingRef.current = null;
      return;
    }
    if (next !== pageRef.current) onPageRef.current?.(next);
  }, []);

  const handleChangeState = useCallback((event) => {
    if (event.data === 'read' && !motionRunningRef.current) setRestingPage(pageRef.current);
  }, []);

  const isCoverPage = (value) => covers && (value <= 0 || value > count);
  // 넓은 화면에서 표지는 한 면만 보여요. 앞표지는 책등 오른쪽, 뒤표지는 책등 왼쪽에 붙은 정사각형이라,
  // 정사각형 반만큼 옮겨 화면 가운데에 둬요. (책이 지금 보여주는 쪽 기준이에요)
  const coverSize = area ? Math.min(pageWidth, area.height) * COVER_SCALE * (1 + COVER_EDGE) : 0;
  const shownPage = motionKind ? (turnFirst ? page : restingPage) : page;
  const shift = !portrait && covers && coverSize
    ? (shownPage <= 0 ? -coverSize / 2 : shownPage > count ? coverSize / 2 : 0)
    : 0;
  // 뒤에 까는 그림은 쪽에서 멈춰 있거나 쪽 사이를 넘길 때만 깔아요. 표지를 펼치고 덮는 동안에는 서재 벽이 보여요.
  const showBackdrop = seamless && !portrait && current?.imageUrl && !motionKind
    && !(isCoverPage(restingPage) && restingPage !== page);

  return (
    <div
      className={`${styles.flipHost} ${className}`}
      ref={hostRef}
      data-seamless={seamless || undefined}
      // 표지가 있는 책은 쪽 그림을 깔지 않는 동안(표지를 보거나 펼치고 덮는 동안) 뒤에 서재 벽을 보여줘요.
      data-wall={covers && !showBackdrop ? true : undefined}
      data-motion={motionKind ?? undefined}
      style={{ '--spread-ratio': spreadRatio, ...(showBackdrop ? { backgroundImage: `url("${current.imageUrl}")` } : {}) }}
      {...hostProps}
    >
      {area?.width > 0 && area?.height > 0 && (
        <div className={styles.flipSlide} ref={slideRef} style={{ transform: `translateX(${shift}px)` }}>
          <ActivePageContext.Provider value={page}>
          <HTMLFlipBook
            // page-flip caches its fixed page dimensions at mount. Rebuild it when
            // the reader rotates or the webview resizes so pages stay centered.
            key={`${portrait ? 'portrait' : 'spread'}-${covers ? 'covers' : 'plain'}-${area.width}x${area.height}`}
            ref={bookRef}
            className={styles.flipBook}
            // 화면 폭이 홀수여도 두 쪽 사이에 틈(밝은 세로줄)이 생기지 않게 올림해요. 넘친 1px은 가려져요.
            width={pageWidth}
            height={area.height}
            size="fixed"
            startPage={pageIndexFor(page, portrait, covers, count)}
            usePortrait={portrait}
            // 표지가 있으면 첫 장·마지막 장을 한 면씩 보여줘요(딱딱한 표지).
            showCover={covers}
            drawShadow
            maxShadowOpacity={0.35}
            flippingTime={flippingTimeFor(pageWidth, area.height)}
            mobileScrollSupport={false}
            useMouseEvents={false}
            onFlip={handleFlip}
            onChangeState={handleChangeState}
          >
            {bookPages}
          </HTMLFlipBook>
          </ActivePageContext.Provider>
        </div>
      )}
      {/* 움직임 코드가 아직 없으면(받는 중) 덮인 표지를 그대로 보여주고, 받는 대로 이어서 움직여요. */}
      {motionKind && !CoverMotion && turnFirst && (
        <CoverMotionPending
          kind={motionKind}
          src={motionKind === 'open' ? frontCover : backCover}
          pageWidth={pageWidth}
          shift={coverSize / 2}
          slideRef={slideRef}
        />
      )}
      {motionKind && CoverMotion && (
        <CoverMotion
          key={`${restingPage}-${page}`}
          kind={motionKind}
          // 펼치기는 앞표지 → 1쪽, 덮기는 마지막 쪽 → 뒤표지가 앞으로 가는 방향이에요.
          reverse={motionKind === 'open' ? page === 0 : page === count}
          src={motionKind === 'open' ? frontCover : backCover}
          insideSrc={pages[0]?.imageUrl}
          pageWidth={pageWidth}
          square={coverSize / (1 + COVER_EDGE)}
          slideRef={slideRef}
          onEnd={finishCoverMotion}
        />
      )}
    </div>
  );
});

export default StoryFlipBook;
