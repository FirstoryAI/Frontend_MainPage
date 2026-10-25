import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import pageArrowLeft from '../../assets/remake/page-arrow-left.svg';
import pageArrowRight from '../../assets/remake/page-arrow-right.svg';
import headerClose from '../../assets/remake/header-close.svg';
import { SCENE_DESCRIPTION, SCENE_GUIDE, storyPages } from '../../features/story/storyPages';
import { useSceneScale } from '../../features/story/hooks/useSceneScale';
import styles from './StoryGuidePage.module.css';

// 동화 상세에서 '대화 가이드 보기'를 누르면 보이는, 쪽마다 부모를 위한 대화 가이드를 함께 읽는 화면이에요.
function StoryGuidePage() {
  const { storyId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const story = location.state?.story;
  const scale = useSceneScale();
  const [currentPage, setCurrentPage] = useState(4);

  const page = storyPages[currentPage - 1];
  const showPage = (nextPage) => {
    setCurrentPage(Math.min(storyPages.length, Math.max(1, nextPage)));
  };

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

        <main className={styles.book}>
          <div className={styles.illustration}>
            <img src={page.image} alt={`${currentPage}쪽 동화 삽화`} />
            <div className={styles.pageCopy}>
              {page.text.map((line) => <p key={line}>{line}</p>)}
            </div>
          </div>
          <div className={styles.pagination}>
            <button type="button" onClick={() => showPage(currentPage - 1)} disabled={currentPage === 1}>
              <img src={pageArrowLeft} alt="" /> 이전 쪽
            </button>
            <strong><span>{currentPage}</span> / {storyPages.length}</strong>
            <button type="button" onClick={() => showPage(currentPage + 1)} disabled={currentPage === storyPages.length}>
              다음 쪽 <img src={pageArrowRight} alt="" />
            </button>
          </div>
        </main>

        <aside className={styles.guide} aria-label="쪽 설명과 대화 가이드">
          <section>
            <h2>동화 설명</h2>
            <p>{SCENE_DESCRIPTION}</p>
          </section>
          <section>
            <h2>부모를 위한 대화 가이드</h2>
            <p>{SCENE_GUIDE}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default StoryGuidePage;
