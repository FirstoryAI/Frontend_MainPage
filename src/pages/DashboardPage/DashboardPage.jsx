import { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import CtaButton from '../../components/ui/CtaButton';
import OnboardingModal from '../../features/onboarding/components/OnboardingModal';
import iconPlus from '../../assets/icons/icon-plus.svg';
import iconBell from '../../assets/icons/icon-bell.svg';
import avatarCircle from '../../assets/icons/avatar-circle.svg';
import avatarPerson from '../../assets/icons/avatar-person.svg';
import styles from './DashboardPage.module.css';

const childName = '토리';

function DashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [onboardingOpen, setOnboardingOpen] = useState(
    Boolean(location.state?.onboarding),
  );

  const closeOnboarding = useCallback(() => {
    setOnboardingOpen(false);
    navigate(location.pathname, { replace: true, state: null });
  }, [navigate, location.pathname]);

  const startStory = () => navigate('/story/new');

  const startFirstStory = () => {
    closeOnboarding();
    startStory();
  };

  return (
    <div className={styles.page}>
      <div className={styles.shell} inert={onboardingOpen}>
        <Sidebar />

        <div className={styles.main}>
          <div className={styles.topbar}>
            <button
              className={styles.bellButton}
              type="button"
              aria-label="알림"
              disabled
              title="알림 화면이 준비되면 연결됩니다"
            >
              <img src={iconBell} alt="" />
            </button>
            <div className={styles.avatar} role="img" aria-label="내 프로필">
              <img className={styles.avatarCircle} src={avatarCircle} alt="" />
              <img className={styles.avatarPerson} src={avatarPerson} alt="" />
            </div>
          </div>

          <main className={styles.content}>
            <section className={styles.greeting} aria-labelledby="greeting-title">
              <h1 id="greeting-title" className={styles.greetingText}>
                안녕하세요 {childName} 부모님,
                <br />
                오늘 아이와 어떤 이야기를 나누고 싶나요?
              </h1>
              <CtaButton
                className={styles.createButton}
                icon={iconPlus}
                onClick={startStory}
              >
                동화 만들기
              </CtaButton>
            </section>

            <div className={styles.cards} aria-hidden="true">
              <div className={styles.card} />
              <div className={styles.card} />
            </div>
          </main>
        </div>
      </div>

      {onboardingOpen && (
        <OnboardingModal onStart={startFirstStory} onClose={closeOnboarding} />
      )}
    </div>
  );
}

export default DashboardPage;
