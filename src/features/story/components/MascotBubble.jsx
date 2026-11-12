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
      {/* data-story-mascot: '다음'을 누르면 이 캐릭터가 버튼으로 날아가요. (MascotTravel) */}
      {showMascot && (
        <div className={`${styles.mascotFrame} ${mascotFrameClassName}`} data-story-mascot>
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
