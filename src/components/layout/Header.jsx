import { Link } from 'react-router-dom';
import closeIcon from '../../assets/mypage/close.svg';
import styles from './Header.module.css';

function Header({ showCloseButton = false, raiseLogo = false }) {
  return (
    <header className={`${styles.header} ${raiseLogo ? styles.raiseLogo : ''}`}>
      <Link className={styles.logo} to="/" aria-label="FIRSTORY 홈">
        FIRSTORY
      </Link>
      {showCloseButton && (
        <Link className={styles.closeButton} to="/" aria-label="홈으로 이동">
          <img src={closeIcon} alt="" />
        </Link>
      )}
    </header>
  );
}

export default Header;
