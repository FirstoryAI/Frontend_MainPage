import iconBack from '../../../assets/icons/icon-back.svg';
import styles from './BackButton.module.css';

function BackButton({ onClick }) {
  return (
    <button className={styles.button} type="button" aria-label="이전" onClick={onClick}>
      <img src={iconBack} alt="" />
    </button>
  );
}

export default BackButton;
