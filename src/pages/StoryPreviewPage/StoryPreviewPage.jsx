import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import pageArrowLeft from '../../assets/remake/page-arrow-left.svg';
import pageArrowRight from '../../assets/remake/page-arrow-right.svg';
import headerClose from '../../assets/remake/header-close.svg';
import readerFrame from '../../assets/story-reader/frame.svg';
import readerArrowLeft from '../../assets/story-reader/arrow-left.svg';
import readerArrowRight from '../../assets/story-reader/arrow-right.svg';
import readerClose from '../../assets/story-reader/close.svg';
import styles from './StoryPreviewPage.module.css';

import { SCENE_DESCRIPTION, SCENE_GUIDE, storyPages as pages } from '../../features/story/storyPages';
import { useSceneScale } from '../../features/story/hooks/useSceneScale';
import RemakeDialog from '../../features/story/components/RemakeDialog';

// initialRemakeOpen: '다시 만들기' 팝업을 연 채로 시작해요. (서재에서 만들지 못한 동화를 다시 만들 때)
// 이때 팝업을 닫으면 미리보기 대신 서재로 돌아가요.
function StoryPreviewPage({ initialRemakeOpen = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { storyId } = useParams();
  const story = location.state?.story ?? {};
  const canRemake = location.state?.canRemake ?? true;
  const [currentPage, setCurrentPage] = useState(1);
  const scale = useSceneScale();
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [isRemakeOpen, setIsRemakeOpen] = useState(initialRemakeOpen);

  useEffect(() => {
    if (!isReaderOpen) return undefined;

    const handleReaderKeys = (event) => {
      if (event.key === 'Escape') setIsReaderOpen(false);
      if (event.key === 'ArrowLeft') setCurrentPage((pageNumber) => Math.max(1, pageNumber - 1));
      if (event.key === 'ArrowRight') setCurrentPage((pageNumber) => Math.min(pages.length, pageNumber + 1));
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleReaderKeys);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleReaderKeys);
    };
  }, [isReaderOpen]);

  const closeRemake = () => {
    if (initialRemakeOpen) {
      navigate('/library');
      return;
    }
    setIsRemakeOpen(false);
  };

  const remake = ({ type, request }) => {
    navigate('/story/new', {
      state: { remake: { storyId: storyId ?? story.id, type, request }, story },
    });
  };

  const page = pages[currentPage - 1];
  const showPage = (nextPage) => {
    setCurrentPage(Math.min(pages.length, Math.max(1, nextPage)));
  };

  return (
    <div className={styles.page}>
      <div className={styles.canvas} style={{ '--scene-scale': scale }}>
        <header className={styles.header}>
          <Link className={styles.logo} to="/home" aria-label="FIRSTORY 홈">FIRSTORY</Link>
          <button className={styles.close} type="button" onClick={() => navigate('/library')} aria-label="서재로 돌아가기">
            <img src={headerClose} alt="" />
          </button>
        </header>

        <h1 className={styles.heading}>미리보기</h1>

        <nav className={styles.pageList} aria-label="동화 페이지" inert={isRemakeOpen}>
          {pages.map((item, index) => {
            const number = index + 1;
            const selected = currentPage === number;
            return (
              <button
                className={`${styles.thumbnail} ${selected ? styles.selectedThumbnail : ''}`}
                type="button"
                key={number}
                onClick={() => showPage(number)}
                aria-label={`${number}쪽 미리보기`}
                aria-current={selected ? 'page' : undefined}
              >
                <img src={item.image} alt="" />
                <span>{number}</span>
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
            <img src={page.image} alt={`${currentPage}쪽 동화 삽화`} />
            <div className={styles.pageCopy}>
              {page.text.map((line) => <p key={line}>{line}</p>)}
            </div>
          </div>
          <div className={styles.pagination}>
            <button type="button" onClick={() => showPage(currentPage - 1)} disabled={currentPage === 1}>
              <img src={pageArrowLeft} alt="" /> 이전 쪽
            </button>
            <strong><span>{currentPage}</span> / 10</strong>
            <button type="button" onClick={() => showPage(currentPage + 1)} disabled={currentPage === pages.length}>
              다음 쪽 <img src={pageArrowRight} alt="" />
            </button>
          </div>
        </main>

        <aside className={styles.storyInfo} inert={isRemakeOpen}>
          <section>
            <h2>동화 설명</h2>
            <p>{SCENE_DESCRIPTION}</p>
          </section>
          <section>
            <h2>부모를 위한 가이드</h2>
            <p>{SCENE_GUIDE}</p>
          </section>
          <p className={styles.remakeNote}>
            {canRemake ? '다시 만들기는 1회 가능해요' : '다시 만들기를 사용했어요'}
          </p>
        </aside>

        <div className={styles.actions} inert={isRemakeOpen}>
          <div className={styles.remakeAction}>
            <button
              type="button"
              onClick={() => setIsRemakeOpen(true)}
              disabled={!canRemake}
            >다시 만들기</button>
          </div>
          <button className={styles.confirm} type="button" onClick={() => navigate('/library', { state: { story, newlyCreated: true } })}>
            이대로 확정
          </button>
        </div>
        {isRemakeOpen && <RemakeDialog onClose={closeRemake} onRemake={remake} />}
      </div>
      {isReaderOpen && (
        <section className={styles.reader} aria-label="동화 읽기" aria-modal="true" role="dialog">
          <div className={styles.readerCanvas}>
            <header className={styles.readerHeader}>
              <button
                className={styles.readerClose}
                type="button"
                onClick={() => setIsReaderOpen(false)}
                aria-label="미리보기로 돌아가기"
              >
                <img src={readerClose} alt="" />
              </button>
              <h1 className={styles.readerTitle}>{story.title || story.name || '공룡 아로의 새 친구'}</h1>
              <div className={styles.readerProgress} aria-label={`${currentPage} / ${pages.length}쪽`}>
                <span>{currentPage} / {pages.length}</span>
                <div className={styles.readerProgressTrack}>
                  <div
                    className={styles.readerProgressFill}
                    style={{ width: `${(currentPage / pages.length) * 100}%` }}
                  />
                </div>
              </div>
            </header>

            <div className={styles.readerBook}>
              <img className={styles.readerFrame} src={readerFrame} alt="" />
              <div className={styles.readerPage}>
                <div className={styles.readerPageContent}>
                  <img src={page.image} alt={`${currentPage}쪽 동화 삽화`} />
                  <div className={styles.readerCopy}>
                    {page.text.map((line, index) => <p key={`${currentPage}-${index}`}>{line}</p>)}
                  </div>
                </div>
              </div>
            </div>

            <button
              className={`${styles.readerArrow} ${styles.readerArrowLeft}`}
              type="button"
              onClick={() => showPage(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="이전 쪽"
            >
              <img src={readerArrowLeft} alt="" />
            </button>
            <button
              className={`${styles.readerArrow} ${styles.readerArrowRight}`}
              type="button"
              onClick={() => showPage(currentPage + 1)}
              disabled={currentPage === pages.length}
              aria-label="다음 쪽"
            >
              <img src={readerArrowRight} alt="" />
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

export default StoryPreviewPage;
