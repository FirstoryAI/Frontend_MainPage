import { savedMascot, savingMascot } from '../mascotTravelImages';
import styles from './MascotTravel.module.css';

function MascotTravel({ active, complete, label }) {
  if (!active) return null;

  return (
    <div className={styles.backdrop} role="status" aria-live="polite">
      <div className={styles.content}>
        <div key={complete ? 'complete' : 'saving'} className={`${styles.mascot} ${complete ? styles.complete : ''}`} aria-hidden="true">
          <div className={styles.artwork}>
            <img
              className={complete ? styles.wink : styles.saving}
              src={complete ? savedMascot : savingMascot}
              alt=""
              // 미리 풀어 둔 그림이라, 그림 없는 빈 프레임 없이 오버레이와 함께 바로 그려요.
              decoding="sync"
            />
          </div>
        </div>
        <p className={styles.caption}>{complete ? '저장 완료!' : label}</p>
      </div>
    </div>
  );
}

export default MascotTravel;
