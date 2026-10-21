import mascot from '../../../assets/images/story-mascot.png';
import bubbleShape from '../../../assets/images/story-bubble.svg';
import styles from './MascotBubble.module.css';

function MascotBubble({
  title,
  description,
  mascotImage = mascot,
  mascotFrameClassName = '',
  showMascot = true,
  className = '',
}) {
  return (
    <div className={`${styles.row} ${className}`}>
      {showMascot && (
        <div className={`${styles.mascotFrame} ${mascotFrameClassName}`}>
          <img className={styles.mascot} src={mascotImage} alt="" width="148" height="148" />
        </div>
      )}
      <div className={styles.bubble}>
        <img className={styles.shape} src={bubbleShape} alt="" />
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>
      </div>
    </div>
  );
}

export default MascotBubble;
