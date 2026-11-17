import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import NotificationBell from '../../components/layout/NotificationBell';
import OnboardingModal from '../../features/onboarding/components/OnboardingModal';
import StoryDraftModal from '../../features/story/components/StoryDraftModal';
import HomeScenarioModal from '../../features/home/components/HomeScenarioModal';
import { listScenarios, scenarioCategoryLabel } from '../../features/home/scenarios';
import { PRIMARY_COPY, SET_COUNT, useConveyor } from '../../features/home/hooks/useConveyor';
import { hasSeenOnboarding, markOnboardingSeen } from '../../features/onboarding/onboardingSeen';
import { useStoryGeneration } from '../../features/story/generation/useStoryGeneration';
import { libraryTopic } from '../../features/story/storyMappers';
import { getDraft } from '../../services/storiesApi';
import { getStories } from '../../services/libraryApi';
import { markOnboardingSeen as saveOnboardingSeen } from '../../services/meApi';
import avatarProfile from '../../assets/images/home/day-design/profile.svg';
import dayBell from '../../assets/images/home/day-design/notification.svg';
import iconPencil from '../../assets/images/home/day-design/section-pencil.svg';
import createPlus from '../../assets/images/home/day-design/create-plus.svg';
import treeCanopy from '../../assets/images/home/day-design/tree-canopy.svg';
import friendWave from '../../assets/images/home/day-design/friend-wave.svg';
import familyWave from '../../assets/images/home/day-design/family-wave.svg';
import kindergartenWave from '../../assets/images/home/day-design/kindergarten-wave.svg';
import tantrumWave from '../../assets/images/home/day-design/tantrum-wave.svg';
import friendCharacter from '../../assets/images/home/day-design/friend-character.webp';
import characterSheet from '../../assets/images/home/day-design/character-sheet.webp';
import kindergartenCharacter from '../../assets/images/home/day-design/kindergarten-character.webp';
import styles from './DashboardPage.module.css';

// 서버에 저장된 '만들던 동화'(아직 인터뷰·확정 전)를 이어 만들 목록으로 바꿔요.
const DRAFT_STATUSES = ['DRAFT', 'INTERVIEWING', 'CONFIRMING'];
const MAX_DRAFTS = 10;
const cardWaves = { friend: friendWave, emotion: familyWave, kindergarten: kindergartenWave, tantrum: tantrumWave, habit: familyWave };
const designedCards = new Set(['friend', 'emotion', 'kindergarten', 'tantrum']);
const dayBackground = '/images/home-day-background.webp';

async function loadDrafts() {
  const { items = [] } = await getStories({ filter: 'CREATING', size: 50 });
  const drafts = items.filter((story) => DRAFT_STATUSES.includes(story.status)).slice(0, MAX_DRAFTS);

  return Promise.all(
    drafts.map(async (story) => {
      const draft = await getDraft(story.id).catch(() => null);
      // 목록 제목은 알아보기 쉬운 상황 설명으로 해요. (없으면 인터뷰가 정리한 부모 고민)
      const concern = (draft?.situation?.description || draft?.parent?.concern)?.trim();
      const categoryLabel = story.categoryLabel ?? draft?.situation?.categoryLabel;
      const category = story.category ?? draft?.situation?.category;
      return {
        id: story.id,
        title: concern ? (concern.length > 28 ? `${concern.slice(0, 28)}…` : concern) : '새로운 동화',
        categoryLabel: (categoryLabel || category) ? libraryTopic({ categoryLabel, category }) : '',
        updatedAt: story.updatedAt,
      };
    }),
  );
}

function DashboardPage({ guest = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const onboardingKey = location.state?.onboardingKey;
  const [onboardingOpen, setOnboardingOpen] = useState(
    () => !guest && Boolean(location.state?.onboarding) && !hasSeenOnboarding(onboardingKey),
  );
  const [storyModal, setStoryModal] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const conveyorScenarios = listScenarios;
  const { resumeGeneration } = useStoryGeneration();

  useEffect(() => {
    if (onboardingOpen) markOnboardingSeen(onboardingKey);
  }, [onboardingKey, onboardingOpen]);

  // 새로고침했을 때 만드는 중인 동화가 있으면 다시 따라가서, 끝나면 알림이 오게 해요.
  useEffect(() => {
    if (!guest) resumeGeneration();
  }, [guest, resumeGeneration]);

  useEffect(() => {
    if (guest || !location.state?.chooseStory) return;
    loadDrafts()
      .then(setDrafts)
      .catch(() => setDrafts([]))
      .finally(() => setStoryModal('choose'));
    navigate(location.pathname, { replace: true, state: null });
  }, [guest, location.pathname, location.state, navigate]);

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
    setSize: conveyorScenarios.length,
    paused: selectedScenario !== null || storyModal !== null || onboardingOpen,
    onCardClick: (scenarioId) => {
      const scenario = listScenarios.find((item) => item.id === scenarioId);
      if (scenario) setSelectedScenario(scenario);
    },
  });

  return (
    <div className={styles.page}>
      <div className={styles.shell} data-theme="day" inert={onboardingOpen || storyModal !== null || selectedScenario !== null}>
        <img className={styles.dayBackground} src={dayBackground} alt="" fetchPriority="high" decoding="async" />
        <img className={styles.treeCanopy} src={treeCanopy} alt="" />
        <Sidebar guest={guest} compact />

        <div className={styles.main}>
          <div className={styles.topbar}>
            {guest ? (
              <Link className={styles.loginLink} to="/auth">로그인</Link>
            ) : <><NotificationBell iconSrc={dayBell} />
            <button
              className={styles.avatarButton}
              type="button"
              onClick={() => navigate('/mypage')}
              aria-label="마이페이지"
            >
              <img className={styles.avatar} src={avatarProfile} alt="" />
            </button></>}
          </div>

          <main className={styles.content}>
            <section className={styles.greeting} aria-labelledby="greeting-title">
              <div className={styles.greetingCopy}>
                <h1 id="greeting-title" className={styles.greetingText}>
                  아이에게 전하고 싶은 마음, 동화로 시작해 보세요
                </h1>
                <button className={styles.createStory} type="button" onClick={() => guest ? navigate('/auth') : navigate('/home', { state: { chooseStory: true } })}>
                  <img src={createPlus} alt="" /> 동화 만들기
                </button>
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
                  더보기 <span aria-hidden="true">→</span>
                </button>
              </div>

              <div
                className={styles.cardViewport}
                ref={viewportRef}
                {...conveyorHandlers}
              >
                <div className={styles.cards} ref={trackRef}>
                  {Array.from({ length: SET_COUNT }, (_, copy) => conveyorScenarios.map((scenario, index) => (
                    <button
                      className={`${styles.card} ${styles[scenario.color]} ${styles[scenario.id] ?? ''}`}
                      type="button"
                      key={`${copy}-${index}-${scenario.id}`}
                      data-scenario-id={scenario.id}
                      aria-haspopup="dialog"
                      aria-label={`${scenarioCategoryLabel(scenario)}: ${scenario.accessibleTitle}`}
                      // 이어 붙인 카드는 모양만 같고 읽거나 포커스를 받지 않아요.
                      aria-hidden={copy !== PRIMARY_COPY || index >= listScenarios.length ? 'true' : undefined}
                      tabIndex={copy !== PRIMARY_COPY || index >= listScenarios.length ? -1 : undefined}
                    >
                      <span className={styles.category}>{scenarioCategoryLabel(scenario)}</span>
                      <span className={styles.cardTitle}>{scenario.title}</span>
                      <img className={styles.cardWave} src={cardWaves[scenario.color]} alt="" />
                      {scenario.id === 'friend' && <img className={styles.friendCharacter} src={friendCharacter} alt="" />}
                      {scenario.id === 'emotion' && <span className={`${styles.spriteCrop} ${styles.familyCharacter}`}><img src={characterSheet} alt="" /></span>}
                      {scenario.id === 'kindergarten' && <span className={styles.kindergartenCharacter}><img src={kindergartenCharacter} alt="" /></span>}
                      {scenario.id === 'tantrum' && <span className={`${styles.spriteCrop} ${styles.tantrumCharacter}`}><img src={characterSheet} alt="" /></span>}
                      {!designedCards.has(scenario.id) && <img className={styles.fallbackCharacter} src={scenario.image} alt="" />}
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
          onStart={() => guest
            ? navigate('/auth')
            : navigate('/story/new', { state: { scenarioId: selectedScenario.id } })}
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
