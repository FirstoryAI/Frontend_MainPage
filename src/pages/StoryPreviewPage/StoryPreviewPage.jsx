import { useLayoutEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import pageArrowLeft from '../../assets/remake/page-arrow-left.svg';
import pageArrowRight from '../../assets/remake/page-arrow-right.svg';
import headerClose from '../../assets/remake/header-close.svg';
import styles from './StoryPreviewPage.module.css';

import page01 from '../../assets/story-preview/story-page-01.png';
import page02 from '../../assets/story-preview/story-page-02.png';
import page03 from '../../assets/story-preview/story-page-03.png';
import page04 from '../../assets/story-preview/story-page-04.png';
import page05 from '../../assets/story-preview/story-page-05.png';
import page06 from '../../assets/story-preview/story-page-06.png';

const pages = [
  { image: page01, text: ['자유놀이 시간이다!', '토리는 좋아하는 블록 놀이 자리로 향했어요.', '오늘은 가장 좋아하는 빨간 블록으로 멋진 집을 만들고 있었지요.'] },
  { image: page02, text: ['그때 같은 반 친구가 토리에게 다가왔어요.', '“우와, 멋지다! 나도 같이 만들어도 돼?”'] },
  { image: page03, text: ['친구는 토리 옆에 있던 빨간 블록 하나를 집었어요.', '토리는 빨간 블록을 가만히 바라보았어요.', '토리는 어떤 기분이었을까요?'] },
  { image: page04, text: ['친구는 빨간 블록을 내려놓았어요.', '“알겠어…”', '조금 전까지 신나 보이던 친구의 얼굴이 슬퍼보여요.'] },
  { image: page05, text: ['집에 돌아온 뒤에도 토리는 유치원에서 있었던 일이 자꾸 생각났어요.', '혼자 가지고 놀고 싶었던 토리의 마음도 진짜였어요.'] },
  { image: page06, text: ['다음 날, 토리는 다시 블록 놀이 자리로 갔어요.', '어제 친구의 얼굴이 떠올랐어요.', '토리는 어떻게 했을까요?'] },
  { image: page01, text: ['토리는 친구에게 먼저 다가갔어요.', '“우리 같이 집을 만들어 볼래?”'] },
  { image: page02, text: ['친구는 환하게 웃으며 고개를 끄덕였어요.', '둘은 빨간 블록을 함께 놓기 시작했어요.'] },
  { image: page03, text: ['둘이 함께 만든 집에는 멋진 지붕이 생겼어요.', '마음도 조금씩 편안해졌어요.'] },
  { image: page06, text: ['토리는 자기 마음을 말해도 괜찮다는 걸 알게 되었어요.', '친구와 함께하는 놀이도 즐거웠지요.'] },
];

function getPreviewScale() {
  if (window.innerWidth <= 760) return 1;
  return Math.min(1, window.innerWidth / 1440, window.innerHeight / 960);
}

function StoryPreviewPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const story = location.state?.story ?? {};
  const canRemake = location.state?.canRemake ?? true;
  const [currentPage, setCurrentPage] = useState(4);
  const [scale, setScale] = useState(getPreviewScale);

  useLayoutEffect(() => {
    const updateScale = () => setScale(getPreviewScale());
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const page = pages[currentPage - 1];
  const showPage = (nextPage) => {
    setCurrentPage(Math.min(pages.length, Math.max(1, nextPage)));
  };

  return (
    <div className={styles.page}>
      <div className={styles.canvas} style={{ '--scene-scale': scale }}>
        <header className={styles.header}>
          <Link className={styles.logo} to="/home" aria-label="FIRSTORY 홈">FIRSTORY</Link>
          <button className={styles.close} type="button" onClick={() => navigate('/home')} aria-label="홈으로 돌아가기">
            <img src={headerClose} alt="" />
          </button>
        </header>

        <h1 className={styles.heading}>미리보기</h1>

        <nav className={styles.pageList} aria-label="동화 페이지">
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
            <strong><span>{currentPage}</span> / 10</strong>
            <button type="button" onClick={() => showPage(currentPage + 1)} disabled={currentPage === pages.length}>
              다음 쪽 <img src={pageArrowRight} alt="" />
            </button>
          </div>
        </main>

        <aside className={styles.storyInfo}>
          <section>
            <h2>동화 설명</h2>
            <p>이래서 이 장면이 만들어졌고 저래{'\n'}서 이 장면이 만들어졌고 등등등</p>
          </section>
          <section>
            <h2>부모를 위한 가이드</h2>
            <p>이 장면에서는 이렇게 말해보세요{'\n'}질문해보세요{'\n'}등등등</p>
          </section>
          <p className={styles.remakeNote}>
            {canRemake ? '다시 만들기는 1회 가능해요' : '다시 만들기를 사용했어요'}
          </p>
        </aside>

        <div className={styles.actions}>
          <div className={styles.remakeAction}>
            <button
              type="button"
              onClick={() => navigate('/story/new', { state: { remake: true, story } })}
              disabled={!canRemake}
            >다시 만들기</button>
          </div>
          <button className={styles.confirm} type="button" onClick={() => navigate('/library', { state: { story, newlyCreated: true } })}>
            이대로 확정
          </button>
        </div>
      </div>
    </div>
  );
}

export default StoryPreviewPage;
