import { useEffect } from 'react';
import readerFrame from '../../../assets/story-reader/frame.svg';
import readerArrowLeft from '../../../assets/story-reader/arrow-left.svg';
import readerArrowRight from '../../../assets/story-reader/arrow-right.svg';
import readerClose from '../../../assets/story-reader/close.svg';
import { usePageTurn } from '../hooks/usePageTurn';
import PageTurnOverlay from './PageTurnOverlay';
import styles from './StoryReader.module.css';

// 동화를 화면 가득 크게 읽는 화면이에요. 미리보기(확정 전)와 아이와 읽기(확정 후)가 함께 써요.
// pages: [{ pageNo, text, imageUrl, imageStatus }], page: 지금 쪽(1부터), children: 쪽 아래에 띄울 보조 영역
function StoryReader({ title, pages, page, onPage, onClose, closeLabel = '돌아가기', children }) {
  const current = pages[page - 1];
  const showPage = (next) => onPage(Math.min(pages.length, Math.max(1, next)));
  const turn = usePageTurn(page, pages.map((item) => item.imageUrl));

  useEffect(() => {
    const handleKeys = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') onPage(Math.max(1, page - 1));
      if (event.key === 'ArrowRight') onPage(Math.min(pages.length, page + 1));
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeys);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeys);
    };
  }, [onClose, onPage, page, pages.length]);

  if (!current) return null;

  const lines = current.text.split('\n').filter(Boolean);

  return (
    <section className={styles.reader} aria-label="동화 읽기" aria-modal="true" role="dialog">
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
          <img className={styles.readerFrame} src={readerFrame} alt="" />
          <div className={styles.readerPage}>
            <div className={styles.readerPageContent}>
              {current.imageUrl ? (
                <img src={current.imageUrl} alt={`${page}쪽 동화 삽화`} />
              ) : (
                <p role="img" aria-label="그림 없음">그림을 아직 준비하지 못했어요.</p>
              )}
              <div className={styles.readerCopy}>
                {lines.map((line, index) => <p key={`${page}-${index}`}>{line}</p>)}
              </div>
              <PageTurnOverlay turn={turn} />
            </div>
          </div>
        </div>

        <button
          className={`${styles.readerArrow} ${styles.readerArrowLeft}`}
          type="button"
          onClick={() => showPage(page - 1)}
          disabled={page === 1}
          aria-label="이전 쪽"
        >
          <img src={readerArrowLeft} alt="" />
        </button>
        <button
          className={`${styles.readerArrow} ${styles.readerArrowRight}`}
          type="button"
          onClick={() => showPage(page + 1)}
          disabled={page === pages.length}
          aria-label="다음 쪽"
        >
          <img src={readerArrowRight} alt="" />
        </button>

        {children && <div className={styles.extra}>{children}</div>}
      </div>
    </section>
  );
}

export default StoryReader;
