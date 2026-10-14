import mascot from '../../../assets/images/story-mascot.png';
import bubbleShape from '../../../assets/images/story-bubble.svg';
import styles from './MascotBubble.module.css';

// withMascot={false}는 마스코트 없이 말풍선만 보여주는 화면(마무리)에 써요.
function MascotBubble({ title, description, className = '', withMascot = true }) {
  return (
    <div className={`${styles.row} ${className}`}>
      {withMascot && (
        <img className={styles.mascot} src={mascot} alt="" width="148" height="148" />
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
