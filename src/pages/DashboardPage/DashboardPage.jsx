import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import NotificationBell from '../../components/layout/NotificationBell';
import OnboardingModal from '../../features/onboarding/components/OnboardingModal';
import StoryDraftModal from '../../features/story/components/StoryDraftModal';
import HomeScenarioModal from '../../features/home/components/HomeScenarioModal';
import { scenarios } from '../../features/home/scenarios';
import { hasSeenOnboarding, markOnboardingSeen } from '../../features/onboarding/onboardingSeen';
import { readStoryDrafts } from '../../features/story/drafts';
import avatarProfile from '../../assets/icons/avatar-profile.svg';
import iconPencil from '../../assets/icons/home-pencil.svg';
import mascotReading from '../../assets/images/home/mascot-reading.png';
import styles from './DashboardPage.module.css';

function DashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const onboardingKey = location.state?.onboardingKey;
  const cardDrag = useRef({ pointerId: null, startX: 0, startScrollLeft: 0, moved: false });
  const [onboardingOpen, setOnboardingOpen] = useState(
    () => Boolean(location.state?.onboarding) && !hasSeenOnboarding(onboardingKey),
  );
  const [storyModal, setStoryModal] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [drafts, setDrafts] = useState([]);
  useEffect(() => {
    if (onboardingOpen) markOnboardingSeen(onboardingKey);
  }, [onboardingKey, onboardingOpen]);

  useEffect(() => {
    if (!location.state?.chooseStory) return;
    setDrafts(readStoryDrafts());
    setStoryModal('choose');
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const closeOnboarding = useCallback(() => {
    markOnboardingSeen(onboardingKey);
    setOnboardingOpen(false);
    navigate(location.pathname, { replace: true, state: null });
  }, [navigate, location.pathname, onboardingKey]);

  const startStory = () => navigate('/story/new');

  const startNewStory = () => navigate('/story/new', { state: { startFresh: true } });

  const startFirstStory = () => {
    closeOnboarding();
    startStory();
  };

  const handleCardPointerDown = (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;

    const viewport = event.currentTarget;
    cardDrag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: viewport.scrollLeft,
      moved: false,
      pressedScenarioId: event.target.closest('[data-scenario-id]')?.dataset.scenarioId ?? null,
    };
    viewport.setPointerCapture(event.pointerId);
  };

  const handleCardPointerMove = (event) => {
    const drag = cardDrag.current;
    if (drag.pointerId !== event.pointerId) return;

    const distance = event.clientX - drag.startX;
    if (Math.abs(distance) > 4) {
      drag.moved = true;
      event.currentTarget.classList.add(styles.dragging);
    }
    if (drag.moved) {
      event.preventDefault();
      event.currentTarget.scrollLeft = drag.startScrollLeft - distance;
    }
  };

  const handleCardPointerUp = (event) => {
    const drag = cardDrag.current;
    if (drag.pointerId !== event.pointerId) return;

    cardDrag.current.pointerId = null;
    event.currentTarget.classList.remove(styles.dragging);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    window.setTimeout(() => {
      cardDrag.current.moved = false;
    }, 0);
  };

  const handleCardClick = (event) => {
    const scenarioId = event.target.closest('[data-scenario-id]')?.dataset.scenarioId
      ?? cardDrag.current.pressedScenarioId;
    const scenario = scenarios.find((item) => item.id === scenarioId);
    cardDrag.current.pressedScenarioId = null;
    if (!cardDrag.current.moved && scenario) setSelectedScenario(scenario);
  };

  return (
    <div className={styles.page}>
      <div className={styles.shell} inert={onboardingOpen || storyModal !== null || selectedScenario !== null}>
        <Sidebar />

        <div className={styles.main}>
          <div className={styles.topbar}>
            <NotificationBell />
            <button
              className={styles.avatarButton}
              type="button"
              onClick={() => navigate('/mypage')}
              aria-label="마이페이지"
            >
              <img className={styles.avatar} src={avatarProfile} alt="" />
            </button>
          </div>

          <main className={styles.content}>
            <section className={styles.greeting} aria-labelledby="greeting-title">
              <img className={styles.greetingMascot} src={mascotReading} alt="동화책을 읽는 Firstory 캐릭터" />
              <div className={styles.greetingCopy}>
                <h1 id="greeting-title" className={styles.greetingText}>
                  오늘, 아이와 어떤 이야기를 나누고 싶으세요?
                </h1>
                <p>아이에게 어떤 말을 건네야 할지 고민될 때, 우리 아이의 이야기를 담은 동화로 대화를 시작해 보세요.</p>
              </div>
            </section>

            <section className={styles.recommendations} aria-labelledby="recommendation-title">
              <div className={styles.sectionHeading}>
                <div>
                  <h2 id="recommendation-title"><img src={iconPencil} alt="" /> 다른 부모들은 이런 순간들을 고민해요</h2>
                  <p>우리 아이와 비슷한 상황을 찾아보고, 대화의 실마리를 발견해 보세요!</p>
                </div>
                <button
                  className={styles.viewAll}
                  type="button"
                  onClick={() => navigate('/scenarios')}
                >
                  전체 보기 <span aria-hidden="true">→</span>
                </button>
              </div>

              <div
                className={styles.cardViewport}
                onPointerDown={handleCardPointerDown}
                onPointerMove={handleCardPointerMove}
                onPointerUp={handleCardPointerUp}
                onPointerCancel={handleCardPointerUp}
                onClick={handleCardClick}
              >
                <div className={styles.cards}>
                  {scenarios.map((scenario) => (
                    <button
                      className={`${styles.card} ${styles[scenario.color]}`}
                      type="button"
                      key={scenario.category}
                      data-scenario-id={scenario.id}
                      aria-haspopup="dialog"
                      aria-label={`${scenario.category}: ${scenario.accessibleTitle}`}
                    >
                      <span className={styles.category}>{scenario.category}</span>
                      <span className={styles.cardTitle}>{scenario.title}</span>
                      <span className={styles.cardDescription}>{scenario.description}</span>
                      <img className={styles.cardImage} src={scenario.image} alt="" />
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>

      {onboardingOpen && (
        <OnboardingModal onStart={startFirstStory} onClose={closeOnboarding} />
      )}
      {selectedScenario && (
        <HomeScenarioModal
          scenario={selectedScenario}
          onClose={() => setSelectedScenario(null)}
          onStart={() => navigate('/story/new', { state: { scenarioId: selectedScenario.id } })}
        />
      )}
      {storyModal && (
        <StoryDraftModal
          mode={storyModal}
          drafts={drafts}
          onClose={() => setStoryModal(null)}
          onStartNew={startNewStory}
          onOpenDraftList={() => setStoryModal('list')}
          onBack={() => setStoryModal('choose')}
          onOpenDraft={(draft) => navigate('/story/new', { state: { draft } })}
        />
      )}
    </div>
  );
}

export default DashboardPage;
