import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import NotificationBell from '../../components/layout/NotificationBell';
import avatarCircle from '../../assets/icons/avatar-circle.svg';
import avatarPerson from '../../assets/icons/avatar-person.svg';
import iconTrash from '../../assets/icons/icon-trash.svg';
import bookCover from '../../assets/images/library-book-cover.png';
import { STORY_TITLE_PLACEHOLDER } from '../../features/story/constants';
import styles from './StoryDetailPage.module.css';

// 줄거리와 읽기 가이드는 동화 생성 결과가 연결되기 전까지 '토리와 빨간 블록' 예시 내용이에요.
const SUMMARY =
  '토리는 가장 좋아하는 빨간 블록으로 집을 짓다가, 친구가 블록을 가져가려 하자 마음이 복잡해져요. 혼자 놀고 싶은 마음도, 친구의 슬픈 표정이 마음에 걸리는 것도 모두 진짜라는 걸 알아가는 이야기예요.';

// 서재에서 '아직 읽지 않았어요'·'함께 읽었어요' 동화를 누르면 보이는 동화 상세 화면이에요.
function StoryDetailPage() {
  const { storyId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const story = location.state?.story;
  const title = story?.title || STORY_TITLE_PLACEHOLDER;

  return (
    <div className={styles.page}>
      <Sidebar />

      <div className={styles.main}>
        <div className={styles.topbar}>
          <NotificationBell />
          <button
            className={styles.avatarButton}
            type="button"
            onClick={() => navigate('/mypage')}
            aria-label="마이페이지"
          >
            <img className={styles.avatarCircle} src={avatarCircle} alt="" />
            <img className={styles.avatarPerson} src={avatarPerson} alt="" />
          </button>
        </div>

        <main className={styles.content}>
          <nav className={styles.crumbs} aria-label="현재 위치">
            <Link to="/library">서재</Link>
            <span aria-hidden="true">&gt;</span>
            <span>{title}</span>
            <span aria-hidden="true">&gt;</span>
            <span aria-current="page">동화 상세</span>
          </nav>
          <h1 className={styles.heading}>동화 한 눈에 보기</h1>

          <div className={styles.detail}>
            <section className={styles.bookColumn} aria-label="동화 표지">
              <div className={styles.cover}>
                {story?.coverUrl ? (
                  <img className={styles.coverFull} src={story.coverUrl} alt={`${title} 표지`} />
                ) : (
                  <img className={styles.coverCrop} src={bookCover} alt={`${title} 표지`} />
                )}
              </div>

              <div className={styles.titleRow}>
                <h2 className={styles.title}>{title}</h2>
                <button className={styles.trash} type="button" disabled title="준비 중" aria-label="동화 삭제">
                  <img src={iconTrash} alt="" />
                </button>
              </div>

              <button className={styles.readButton} type="button" disabled title="준비 중">
                아이와 읽기 시작하기
              </button>
              <button
                className={styles.guideButton}
                type="button"
                onClick={() => navigate(`/library/${storyId}/guide`, { state: { story } })}
              >
                대화 가이드 보기
              </button>
            </section>

            <div className={styles.cards}>
              <section className={`${styles.card} ${styles.summaryCard}`}>
                <h2>동화 줄거리</h2>
                <p>{SUMMARY}</p>
              </section>
              <section className={styles.card}>
                <h2>읽기 전에</h2>
                <p>
                  정답을 말해 주기보다 아이 말을 먼저 들어 주세요.
                  <br />
                  아이가 이야기하고 싶어 하지 않으면 그냥 읽고 넘어가도 괜찮아요.
                </p>
              </section>
              <section className={`${styles.card} ${styles.afterCard}`}>
                <h2>다 읽은 뒤에</h2>
                <p className={styles.question}>“너도 친구랑 놀고 싶었는데 속상했던 적 있어?”</p>
                <p>아이의 이야기로 꼭 넘어가지 않아도 괜찮아요</p>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default StoryDetailPage;
