import { Link, useLocation, useNavigate } from 'react-router-dom';
import CtaButton from '../ui/CtaButton';
import iconPlus from '../../assets/icons/icon-plus.svg';
import iconHome from '../../assets/icons/icon-home.svg';
import iconHomeMuted from '../../assets/icons/icon-home-muted.svg';
import iconLibrary from '../../assets/icons/icon-library.svg';
import iconLibraryActive from '../../assets/icons/icon-library-active.svg';
import iconLogout from '../../assets/icons/icon-logout.svg';
import styles from './Sidebar.module.css';

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const libraryActive = location.pathname.startsWith('/library');

  return (
    <aside className={styles.sidebar}>
      <Link className={styles.logo} to="/home" aria-label="FIRSTORY 홈">
        FIRSTORY
      </Link>

      <CtaButton
        className={styles.createButton}
        icon={iconPlus}
        onClick={() => navigate('/home', { state: { chooseStory: true } })}
      >
        동화 만들기
      </CtaButton>

      <nav className={styles.nav} aria-label="주요 메뉴">
        <Link
          className={`${styles.item} ${!libraryActive ? styles.active : ''}`}
          to="/home"
          aria-current={!libraryActive ? 'page' : undefined}
        >
          <img
            className={styles.homeIcon}
            src={libraryActive ? iconHomeMuted : iconHome}
            alt=""
          />
          <span>홈</span>
        </Link>
        <Link
          className={`${styles.item} ${libraryActive ? styles.active : ''}`}
          to="/library"
          aria-current={libraryActive ? 'page' : undefined}
        >
          <img src={libraryActive ? iconLibraryActive : iconLibrary} alt="" />
          <span>서재</span>
        </Link>
      </nav>

      <Link className={`${styles.item} ${styles.logout}`} to="/">
        <img src={iconLogout} alt="" />
        <span>로그아웃</span>
      </Link>
    </aside>
  );
}

export default Sidebar;
