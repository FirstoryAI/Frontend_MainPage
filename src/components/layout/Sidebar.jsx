import { Link, useNavigate } from 'react-router-dom';
import CtaButton from '../ui/CtaButton';
import iconPlus from '../../assets/icons/icon-plus.svg';
import iconHome from '../../assets/icons/icon-home.svg';
import iconLibrary from '../../assets/icons/icon-library.svg';
import iconLogout from '../../assets/icons/icon-logout.svg';
import styles from './Sidebar.module.css';

function Sidebar() {
  const navigate = useNavigate();

  return (
    <aside className={styles.sidebar}>
      <Link className={styles.logo} to="/home" aria-label="FIRSTORY 홈">
        FIRSTORY
      </Link>

      <CtaButton
        className={styles.createButton}
        icon={iconPlus}
        onClick={() => navigate('/story/new')}
      >
        동화 만들기
      </CtaButton>

      <nav className={styles.nav} aria-label="주요 메뉴">
        <Link
          className={`${styles.item} ${styles.active}`}
          to="/home"
          aria-current="page"
        >
          <img className={styles.homeIcon} src={iconHome} alt="" />
          <span>홈</span>
        </Link>
        <button
          className={styles.item}
          type="button"
          disabled
          title="서재 화면이 준비되면 연결됩니다"
        >
          <img src={iconLibrary} alt="" />
          <span>서재</span>
        </button>
      </nav>

      <Link className={`${styles.item} ${styles.logout}`} to="/">
        <img src={iconLogout} alt="" />
        <span>로그아웃</span>
      </Link>
    </aside>
  );
}

export default Sidebar;
