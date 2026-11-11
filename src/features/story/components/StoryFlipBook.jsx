import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import StoryFlipPage from './StoryFlipPage';
import styles from './StoryReader.module.css';

const pageIndexFor = (number, portrait) => (number - 1) * (portrait ? 1 : 2);
const pageNumberFor = (index, portrait) => Math.floor(index / (portrait ? 1 : 2)) + 1;

// 책장 넘김 효과가 있는 동화책이에요. 아이와 읽기, 크게 보기, 미리보기가 함께 써요.
//  - page가 바뀌면 그 쪽으로 책장을 넘겨요. 손으로 끌어 넘기면 onPage로 알려줘요.
//  - 넓은 화면에서는 그림 한 장을 펼친 두 쪽(왼쪽·오른쪽 절반)으로 나눠 보여줘요. portrait면 한 쪽씩이에요.
//  - seamless: 쪽 바탕을 비우고 지금 그림을 뒤에 깔아서, 두 쪽이 만나는 곳(소수점 픽셀)에 밝은 세로줄이 보이지 않게 해요.
//  - 마우스·터치로 넘기는 처리는 라이브러리에서 꺼 뒀어요. 끌어서 넘기려면 useFlipDrag 핸들러를 넘겨줘요.
// pages: [{ pageNo, text, textBlocks, imageUrl, imageNote? }], copyClassName·fallbackClassName: 글 상자·그림 없음 안내 모양
// ref로 pageFlip()(라이브러리)과 host()(책을 담은 칸)를 꺼낼 수 있어요.
const StoryFlipBook = forwardRef(function StoryFlipBook({
  pages,
  page,
  onPage,
  portrait = false,
  seamless = false,
  copyClassName,
  fallbackClassName,
  className = '',
  ...hostProps
}, ref) {
  const bookRef = useRef(null);
  const hostRef = useRef(null);
  const pageRef = useRef(page);
  const onPageRef = useRef(onPage);
  const portraitRef = useRef(portrait);
  // page가 바뀌어 넘기는 중인 목표 쪽이에요. 그 사이에 오는 넘김 알림은 무시해요.
  const pendingRef = useRef(null);
  const [area, setArea] = useState(null);
  const current = pages[page - 1];

  useImperativeHandle(ref, () => ({
    pageFlip: () => bookRef.current?.pageFlip?.(),
    host: () => hostRef.current,
  }), []);

  const bookPages = useMemo(() => pages.flatMap((item, index) => {
    const common = { storyPage: item, pageNumber: index + 1, copyClassName, fallbackClassName };
    return portrait
      ? [<StoryFlipPage key={`${index}-single`} {...common} portrait />]
      : [
        <StoryFlipPage key={`${index}-left`} {...common} side="left" />,
        <StoryFlipPage key={`${index}-right`} {...common} side="right" />,
      ];
  }), [pages, portrait, copyClassName, fallbackClassName]);

  useEffect(() => {
    pageRef.current = page;
    onPageRef.current = onPage;
    portraitRef.current = portrait;
  }, [page, onPage, portrait]);

  useEffect(() => {
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
    if (pageNumberFor(book.getCurrentPageIndex(), portrait) === page) {
      pendingRef.current = null;
      return;
    }
    pendingRef.current = page;
    book.flip(pageIndexFor(page, portrait));
    // 넘김이 시작되지 않았으면 바로 그 쪽을 보여줘요.
    if (book.getState() === 'read') {
      book.turnToPage(pageIndexFor(page, portrait));
      pendingRef.current = null;
    }
  }, [page, portrait, area]);

  const handleFlip = useCallback((event) => {
    const next = pageNumberFor(event.data, portraitRef.current);
    if (pendingRef.current != null) {
      if (next === pendingRef.current) pendingRef.current = null;
      return;
    }
    if (next !== pageRef.current) onPageRef.current?.(next);
  }, []);

  return (
    <div
      className={`${styles.flipHost} ${className}`}
      ref={hostRef}
      data-seamless={seamless || undefined}
      style={seamless && !portrait && current?.imageUrl ? { backgroundImage: `url("${current.imageUrl}")` } : undefined}
      {...hostProps}
    >
      {area?.width > 0 && area?.height > 0 && (
        <HTMLFlipBook
          key={portrait ? 'portrait' : 'spread'}
          ref={bookRef}
          className={styles.flipBook}
          // 화면 폭이 홀수여도 두 쪽 사이에 틈(밝은 세로줄)이 생기지 않게 올림해요. 넘친 1px은 가려져요.
          width={portrait ? area.width : Math.ceil(area.width / 2)}
          height={area.height}
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
  );
});

export default StoryFlipBook;
