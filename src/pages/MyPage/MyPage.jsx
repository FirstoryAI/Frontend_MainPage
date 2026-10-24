import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import closeIcon from '../../assets/mypage/close.svg';
import profileIllustration from '../../assets/mypage/profile-camera.svg';
import cameraBadge from '../../assets/mypage/camera-badge.svg';
import cameraIcon from '../../assets/mypage/camera.svg';
import divider from '../../assets/mypage/divider.svg';
import chevron from '../../assets/mypage/chevron.svg';
import userIcon from '../../assets/mypage/icon-user.svg';
import bellIcon from '../../assets/mypage/icon-bell.svg';
import termsIcon from '../../assets/mypage/icon-terms.svg';
import subscriptionIcon from '../../assets/mypage/icon-subscription.svg';
import ChildInfoModal from '../../features/profile/components/ChildInfoModal';
import NotificationModal from '../../features/profile/components/NotificationModal';
import TermsModal from '../../features/profile/components/TermsModal';
import { loadChildProfile, saveChildProfile } from '../../features/profile/childProfile';
import styles from './MyPage.module.css';

const menuItems = [
  { label: '아이 정보', icon: userIcon },
  { label: '알림 설정', icon: bellIcon },
  { label: '이용약관 · 개인정보 처리 방침', icon: termsIcon },
  { label: '구독 관리', icon: subscriptionIcon },
];

function MyPage() {
  const navigate = useNavigate();
  const fileInput = useRef(null);
  const [profileImage, setProfileImage] = useState('');
  const [childInfoOpen, setChildInfoOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [child, setChild] = useState(() => loadChildProfile());

  useEffect(() => {
    const syncChildProfile = (event) => {
      if (!event.key || event.key === 'firstory.childProfile') {
        setChild(loadChildProfile());
      }
    };
    window.addEventListener('storage', syncChildProfile);
    return () => window.removeEventListener('storage', syncChildProfile);
  }, []);

  const handleSaveChild = (updatedChild) => {
    saveChildProfile(updatedChild);
    setChild(updatedChild);
    setChildInfoOpen(false);
  };

  const handleProfileImageChange = (event) => {
    const [file] = event.target.files ?? [];
    if (!file) return;
    setProfileImage(URL.createObjectURL(file));
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.logo} to="/home" aria-label="FIRSTORY 홈">
          FIRSTORY
        </Link>
        <button
          className={styles.closeButton}
          type="button"
          onClick={() => navigate('/home')}
          aria-label="마이페이지 닫기"
        >
          <img src={closeIcon} alt="" />
        </button>
      </header>

      <main className={styles.content}>
        <div className={styles.profileArea}>
          <img className={styles.profileIllustration} src={profileIllustration} alt="프로필" />
          {profileImage && (
            <img className={styles.profilePhoto} src={profileImage} alt="등록한 프로필 사진" />
          )}
          <button
            className={styles.photoButton}
            type="button"
            onClick={() => fileInput.current?.click()}
            aria-label="프로필 사진 변경"
          >
            <img className={styles.cameraBadge} src={cameraBadge} alt="" />
            <img className={styles.cameraIcon} src={cameraIcon} alt="" />
          </button>
          <input
            ref={fileInput}
            className={styles.fileInput}
            type="file"
            accept="image/*"
            onChange={handleProfileImageChange}
            aria-label="프로필 사진 파일 선택"
          />
        </div>

        <img className={styles.divider} src={divider} alt="" />

        <ul className={styles.menu} aria-label="마이페이지 메뉴">
          {menuItems.map((item) => (
            <li className={styles.menuItem} key={item.label}>
              {item.label === '아이 정보' ? (
                <button
                  className={styles.menuAction}
                  type="button"
                  onClick={() => setChildInfoOpen(true)}
                  aria-haspopup="dialog"
                >
                  <img className={styles.menuIcon} src={item.icon} alt="" />
                  <span>{item.label}</span>
                  <span className={styles.chevronBox} aria-hidden="true">
                    <img className={styles.chevron} src={chevron} alt="" />
                  </span>
                </button>
              ) : item.label === '알림 설정' ? (
                <button
                  className={styles.menuAction}
                  type="button"
                  onClick={() => setNotificationOpen(true)}
                  aria-haspopup="dialog"
                >
                  <img className={styles.menuIcon} src={item.icon} alt="" />
                  <span>{item.label}</span>
                  <span className={styles.chevronBox} aria-hidden="true">
                    <img className={styles.chevron} src={chevron} alt="" />
                  </span>
                </button>
              ) : item.label === '이용약관 · 개인정보 처리 방침' ? (
                <button
                  className={styles.menuAction}
                  type="button"
                  onClick={() => setTermsOpen(true)}
                  aria-haspopup="dialog"
                >
                  <img className={styles.menuIcon} src={item.icon} alt="" />
                  <span>{item.label}</span>
                  <span className={styles.chevronBox} aria-hidden="true">
                    <img className={styles.chevron} src={chevron} alt="" />
                  </span>
                </button>
              ) : (
                <div className={styles.menuContents}>
                  <img className={styles.menuIcon} src={item.icon} alt="" />
                  <span>{item.label}</span>
                  <span className={styles.chevronBox} aria-hidden="true">
                    <img className={styles.chevron} src={chevron} alt="" />
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>

        <img className={styles.divider} src={divider} alt="" />

        <ul className={styles.accountMenu} aria-label="계정 메뉴">
          <li className={styles.accountItem}>
            <span>탈퇴하기</span>
            <span className={styles.chevronBox} aria-hidden="true">
              <img className={styles.chevron} src={chevron} alt="" />
            </span>
          </li>
        </ul>
      </main>

      {childInfoOpen && (
        <ChildInfoModal child={child} onSave={handleSaveChild} onClose={() => setChildInfoOpen(false)} />
      )}
      {termsOpen ? (
        <TermsModal onClose={() => setTermsOpen(false)} />
      ) : notificationOpen ? (
        <NotificationModal onClose={() => setNotificationOpen(false)} />
      ) : null}
    </div>
  );
}

export default MyPage;
