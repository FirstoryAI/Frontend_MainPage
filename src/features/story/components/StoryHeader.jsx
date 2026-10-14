import { Link } from 'react-router-dom';
import iconExit from '../../../assets/icons/icon-exit.svg';
import styles from './StoryHeader.module.css';

// progress가 없으면(동화 만드는 중 화면) 로고만 보여줘요.
function StoryHeader({ progress = null }) {
  return (
    <header className={styles.header}>
      <Link className={styles.logo} to="/home" aria-label="FIRSTORY 홈">
        FIRSTORY
      </Link>

      {progress !== null && (
        <>
          <div
            className={styles.progress}
            role="progressbar"
            aria-label="동화 만들기 진행 상황"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
          >
            <div className={styles.fill} style={{ width: `${progress * 100}%` }} />
          </div>

          <Link className={styles.exit} to="/home" aria-label="동화 만들기 나가기">
            <img src={iconExit} alt="" />
          </Link>
        </>
      )}
    </header>
  );
}

export default StoryHeader;
