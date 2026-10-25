import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import pageArrowLeft from '../../assets/remake/page-arrow-left.svg';
import pageArrowRight from '../../assets/remake/page-arrow-right.svg';
import headerClose from '../../assets/remake/header-close.svg';
import { guideFor } from '../../features/story/guideContent';
import { useSceneScale } from '../../features/story/hooks/useSceneScale';
import { getBook, getGuide } from '../../services/storiesApi';
import styles from './StoryGuidePage.module.css';

// 동화 상세에서 '대화 가이드 보기'를 누르면 보이는, 쪽마다 부모를 위한 대화 가이드를 함께 읽는 화면이에요.
// (GET /api/stories/{id}/book, /guide — 확정한 동화만 볼 수 있어요)
function StoryGuidePage() {
  const { storyId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const story = location.state?.story;
  const scale = useSceneScale();
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let active = true;
    Promise.all([getBook(storyId), getGuide(storyId)])
      .then(([book, guide]) => active && setData({ book, guide }))
      .catch((error) => active && setLoadError(error.message || '대화 가이드를 불러오지 못했어요.'));
    return () => {
      active = false;
    };
  }, [storyId]);

  const pages = data?.book.pages ?? [];
  const page = pages[currentPage - 1];
  const showPage = (nextPage) => {
    setCurrentPage(Math.min(pages.length, Math.max(1, nextPage)));
  };
  const guide = data ? guideFor(data.guide, currentPage, pages.length) : null;

  return (
    <div className={styles.page}>
      <div className={styles.canvas} style={{ '--scene-scale': scale }}>
        <header className={styles.header}>
          <Link className={styles.logo} to="/home" aria-label="FIRSTORY 홈">FIRSTORY</Link>
          <button
            className={styles.close}
            type="button"
            onClick={() => navigate(`/library/${storyId}`, { state: { story } })}
            aria-label="동화 상세로 돌아가기"
          >
            <img src={headerClose} alt="" />
          </button>
        </header>

        {!data ? (
          <p className={styles.status} role={loadError ? 'alert' : 'status'}>
            {loadError || '대화 가이드를 불러오는 중이에요.'}
          </p>
        ) : (
          <>
            <main className={styles.book}>
              <div className={styles.illustration}>
                {page.imageUrl ? (
                  <img src={page.imageUrl} alt={`${currentPage}쪽 동화 삽화`} />
                ) : (
                  <p className={styles.noImage}>그림을 아직 준비하지 못했어요.</p>
                )}
                <div className={styles.pageCopy}>
                  {page.text.split('\n').filter(Boolean).map((line) => <p key={line}>{line}</p>)}
                </div>
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

            <aside className={styles.guide} aria-label="쪽 설명과 대화 가이드">
              <section>
                <h2>동화 설명</h2>
                <p>{guide.description}</p>
              </section>
              <section>
                <h2>부모를 위한 대화 가이드</h2>
                <p>{guide.talk}</p>
              </section>
            </aside>
          </>
        )}
      </div>
    </div>
  );
}

export default StoryGuidePage;
