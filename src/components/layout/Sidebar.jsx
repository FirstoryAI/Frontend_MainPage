import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import CtaButton from '../ui/CtaButton';
import iconPlus from '../../assets/icons/icon-plus.svg';
import iconHome from '../../assets/icons/icon-home.svg';
import iconHomeMuted from '../../assets/icons/icon-home-muted.svg';
import iconLibrary from '../../assets/icons/icon-library.svg';
import iconLibraryActive from '../../assets/icons/icon-library-active.svg';
import iconLogout from '../../assets/icons/icon-logout.svg';
import { logout } from '../../services/authApi';
import { setSignedInStatus } from '../../features/auth/useSignedIn';
import styles from './Sidebar.module.css';
import dayRail from '../../assets/images/home/day-design/sidebar-rail.svg';
import libraryRail from '../../assets/images/library/sidebar-rail-library.svg';

function Sidebar({ guest = false, compact = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const libraryActive = location.pathname.startsWith('/library');

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setLogoutError('');

    try {
      await logout();
      setSignedInStatus(false);
      navigate('/', { replace: true });
    } catch (requestError) {
      setLogoutError(requestError.message || '로그아웃하지 못했어요.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (compact) {
    return (
      <aside className={styles.compactSidebar} aria-label="주요 메뉴">
        <Link className={styles.compactLogo} to={guest ? '/' : '/home'} aria-label="FIRSTORY 홈">FIRSTORY</Link>
        <nav className={styles.compactRail} aria-label="주요 메뉴">
          {/* 지금 화면(홈·서재)의 아이콘이 주황색인 막대 그림이에요. */}
          <img src={libraryActive ? libraryRail : dayRail} alt="" aria-hidden="true" />
          <button className={`${styles.railAction} ${styles.railCreate}`} type="button" aria-label="동화 만들기"
            onClick={() => guest ? navigate('/auth') : navigate('/home', { state: { chooseStory: true } })} />
          <Link className={`${styles.railAction} ${styles.railHome}`} to={guest ? '/' : '/home'} aria-label="홈" aria-current={libraryActive ? undefined : 'page'}><img src={libraryActive ? iconHomeMuted : iconHome} alt="" /><span>홈</span></Link>
          <Link className={`${styles.railAction} ${styles.railLibrary}`} to="/library" aria-label="서재" aria-current={libraryActive ? 'page' : undefined}><img src={libraryActive ? iconLibraryActive : iconLibrary} alt="" /><span>서재</span></Link>
          {guest ? (
            <Link className={`${styles.railAction} ${styles.railLogout}`} to="/auth" aria-label="로그인"><img src={iconLogout} alt="" /><span>로그인</span></Link>
          ) : (
            <button className={`${styles.railAction} ${styles.railLogout}`} type="button" aria-label="로그아웃"
              onClick={handleLogout} disabled={isLoggingOut}><img src={iconLogout} alt="" /><span>로그아웃</span></button>
          )}
        </nav>
        {!guest && logoutError && <p className={styles.compactLogoutError} role="alert">{logoutError}</p>}
      </aside>
    );
  }

  return (
    <aside className={styles.sidebar}>
      <Link className={styles.logo} to={guest ? '/' : '/home'} aria-label="FIRSTORY 홈">
        FIRSTORY
      </Link>

      <CtaButton
        className={styles.createButton}
        icon={iconPlus}
        onClick={() => guest ? navigate('/auth') : navigate('/home', { state: { chooseStory: true } })}
      >
        동화 만들기
      </CtaButton>

      <nav className={styles.nav} aria-label="주요 메뉴">
        <Link
          className={`${styles.item} ${!libraryActive ? styles.active : ''}`}
          to={guest ? '/' : '/home'}
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

      {!guest && logoutError && (
        <p className={styles.logoutError} role="alert">
          {logoutError}
        </p>
      )}
      {!guest && <button
        className={`${styles.item} ${styles.logout}`}
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
      >
        <img src={iconLogout} alt="" />
        <span>{isLoggingOut ? '로그아웃 중…' : '로그아웃'}</span>
      </button>}
    </aside>
  );
}

export default Sidebar;
