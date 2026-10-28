import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import NotificationBell from '../../components/layout/NotificationBell';
import OnboardingModal from '../../features/onboarding/components/OnboardingModal';
import StoryDraftModal from '../../features/story/components/StoryDraftModal';
import HomeScenarioModal from '../../features/home/components/HomeScenarioModal';
import { scenarios } from '../../features/home/scenarios';
import { SET_COUNT, useConveyor } from '../../features/home/hooks/useConveyor';
import { hasSeenOnboarding, markOnboardingSeen } from '../../features/onboarding/onboardingSeen';
import { useStoryGeneration } from '../../features/story/generation/useStoryGeneration';
import { getDraft } from '../../services/storiesApi';
import { getStories } from '../../services/libraryApi';
import { markOnboardingSeen as saveOnboardingSeen } from '../../services/meApi';
import avatarProfile from '../../assets/icons/avatar-profile.svg';
import iconPencil from '../../assets/icons/home-pencil.svg';
import mascotReading from '../../assets/images/home/mascot-reading.png';
import styles from './DashboardPage.module.css';

// 서버에 저장된 '만들던 동화'(아직 인터뷰·확정 전)를 이어 만들 목록으로 바꿔요.
const DRAFT_STATUSES = ['DRAFT', 'INTERVIEWING', 'CONFIRMING'];
const MAX_DRAFTS = 10;

async function loadDrafts() {
  const { items = [] } = await getStories({ filter: 'CREATING', size: 50 });
  const drafts = items.filter((story) => DRAFT_STATUSES.includes(story.status)).slice(0, MAX_DRAFTS);

  return Promise.all(
    drafts.map(async (story) => {
      const draft = await getDraft(story.id).catch(() => null);
      const concern = draft?.parent?.concern?.trim();
      return {
        id: story.id,
        title: concern ? (concern.length > 28 ? `${concern.slice(0, 28)}…` : concern) : '새로운 동화',
        categoryLabel: story.categoryLabel ?? draft?.situation?.categoryLabel ?? '',
        updatedAt: story.updatedAt,
      };
    }),
  );
}

function DashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const onboardingKey = location.state?.onboardingKey;
  const [onboardingOpen, setOnboardingOpen] = useState(
    () => Boolean(location.state?.onboarding) && !hasSeenOnboarding(onboardingKey),
  );
  const [storyModal, setStoryModal] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const { resumeGeneration } = useStoryGeneration();

  useEffect(() => {
    if (onboardingOpen) markOnboardingSeen(onboardingKey);
  }, [onboardingKey, onboardingOpen]);

  // 새로고침했을 때 만드는 중인 동화가 있으면 다시 따라가서, 끝나면 알림이 오게 해요.
  useEffect(() => {
    resumeGeneration();
  }, [resumeGeneration]);

  useEffect(() => {
    if (!location.state?.chooseStory) return;
    loadDrafts().then(setDrafts).catch(() => setDrafts([]));
    setStoryModal('choose');
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const closeOnboarding = useCallback(() => {
    markOnboardingSeen(onboardingKey);
    saveOnboardingSeen().catch(() => {});
    setOnboardingOpen(false);
    navigate(location.pathname, { replace: true, state: null });
  }, [navigate, location.pathname, onboardingKey]);

  const startStory = () => navigate('/story/new');

  const startNewStory = () => navigate('/story/new', { state: { startFresh: true } });

  const startFirstStory = () => {
    closeOnboarding();
    startStory();
  };

  const { viewportRef, trackRef, handlers: conveyorHandlers } = useConveyor({
    setSize: scenarios.length,
    paused: selectedScenario !== null || storyModal !== null || onboardingOpen,
    onCardClick: (scenarioId) => {
      const scenario = scenarios.find((item) => item.id === scenarioId);
      if (scenario) setSelectedScenario(scenario);
    },
  });

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
                ref={viewportRef}
                {...conveyorHandlers}
              >
                <div className={styles.cards} ref={trackRef}>
                  {Array.from({ length: SET_COUNT }, (_, copy) => scenarios.map((scenario) => (
                    <button
                      className={`${styles.card} ${styles[scenario.color]}`}
                      type="button"
                      key={`${copy}-${scenario.category}`}
                      data-scenario-id={scenario.id}
                      aria-haspopup="dialog"
                      aria-label={`${scenario.category}: ${scenario.accessibleTitle}`}
                      // 이어 붙인 카드는 모양만 같고 읽거나 포커스를 받지 않아요.
                      aria-hidden={copy > 0 ? 'true' : undefined}
                      tabIndex={copy > 0 ? -1 : undefined}
                    >
                      <span className={styles.category}>{scenario.category}</span>
                      <span className={styles.cardTitle}>{scenario.title}</span>
                      <span className={styles.cardDescription}>{scenario.description}</span>
                      <img className={styles.cardImage} src={scenario.image} alt="" />
                    </button>
                  )))}
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
          onOpenDraft={(draft) => navigate('/story/new', { state: { draftStoryId: draft.id } })}
        />
      )}
    </div>
  );
}

export default DashboardPage;
