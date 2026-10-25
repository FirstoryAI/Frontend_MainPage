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
import SubscriptionModal from '../../features/profile/components/SubscriptionModal';
import WithdrawModal from '../../features/profile/components/WithdrawModal';
import { fromChild, toChildProfile } from '../../features/story/storyMappers';
import { createChild, getChildren, updateChild } from '../../services/childrenApi';
import { withdraw } from '../../services/meApi';
import { initializeCsrf } from '../../services/apiClient';
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
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  // 서버에 저장된 아이 프로필(첫 번째)이에요. 없으면 null이고, 저장하면 새로 만들어요.
  const [childId, setChildId] = useState(null);
  const [child, setChild] = useState(null);

  useEffect(() => {
    let active = true;
    getChildren()
      .then((children) => {
        if (!active || children.length === 0) return;
        setChildId(children[0].id);
        setChild(fromChild(children[0]));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // 아이 정보를 서버에 저장해요. 저장하지 못하면 이유를 돌려줘서 팝업에 보여줘요.
  const handleSaveChild = async (updatedChild) => {
    if (!updatedChild.birthYear || !updatedChild.birthMonth) return '나이를 입력해 주세요.';

    try {
      const profile = toChildProfile(updatedChild);
      const saved = childId ? await updateChild(childId, profile) : await createChild(profile);
      setChildId(saved.id);
      setChild(fromChild(saved));
      setChildInfoOpen(false);
      return '';
    } catch (error) {
      return error.message || '아이 정보를 저장하지 못했어요.';
    }
  };

  // 탈퇴하면 서버가 모든 기기의 로그인을 끊어요. 쿠키가 지워지므로 CSRF 토큰을 다시 받아 둬요.
  const handleWithdraw = async (password) => {
    try {
      await withdraw(password);
      await initializeCsrf().catch(() => {});
      navigate('/', { replace: true });
      return '';
    } catch (error) {
      return error.message || '탈퇴하지 못했어요. 잠시 뒤에 다시 시도해 주세요.';
    }
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
              ) : item.label === '구독 관리' ? (
                <button
                  className={styles.menuAction}
                  type="button"
                  onClick={() => setSubscriptionOpen(true)}
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
            <button
              className={styles.menuAction}
              type="button"
              onClick={() => setWithdrawOpen(true)}
              aria-haspopup="dialog"
            >
              <span>탈퇴하기</span>
              <span className={styles.chevronBox} aria-hidden="true">
                <img className={styles.chevron} src={chevron} alt="" />
              </span>
            </button>
          </li>
        </ul>
      </main>

      {childInfoOpen && (
        <ChildInfoModal child={child} onSave={handleSaveChild} onClose={() => setChildInfoOpen(false)} />
      )}
      {withdrawOpen && <WithdrawModal onConfirm={handleWithdraw} onClose={() => setWithdrawOpen(false)} />}
      {termsOpen ? (
        <TermsModal onClose={() => setTermsOpen(false)} />
      ) : subscriptionOpen ? (
        <SubscriptionModal onClose={() => setSubscriptionOpen(false)} />
      ) : notificationOpen ? (
        <NotificationModal onClose={() => setNotificationOpen(false)} />
      ) : null}
    </div>
  );
}

export default MyPage;
