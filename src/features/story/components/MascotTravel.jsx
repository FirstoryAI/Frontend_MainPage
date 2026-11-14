import savingMascot from '../../../assets/images/story-summary-mascot.png';
import savedMascot from '../../../assets/images/story-save-wink.png';
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
            />
          </div>
        </div>
        <p className={styles.caption}>{complete ? '저장 완료!' : label}</p>
      </div>
    </div>
  );
}

export default MascotTravel;
