import mascot from '../../../assets/images/story-mascot.png';
import bubbleShape from '../../../assets/images/story-bubble.svg';
import styles from './MascotBubble.module.css';

function MascotBubble({ title, description, className = '' }) {
  return (
    <div className={`${styles.row} ${className}`}>
      <img className={styles.mascot} src={mascot} alt="" width="148" height="148" />
      <div className={styles.bubble}>
        <img className={styles.shape} src={bubbleShape} alt="" />
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>
      </div>
    </div>
  );
}

export default MascotBubble;
