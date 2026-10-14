import { Link } from 'react-router-dom';
import styles from './Header.module.css';

function Header() {
  return (
    <header className={styles.header}>
      <Link className={styles.logo} to="/" aria-label="FIRSTORY 홈">
        FIRSTORY
      </Link>
    </header>
  );
}

export default Header;
