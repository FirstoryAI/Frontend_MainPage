import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import NotificationBell from '../../components/layout/NotificationBell';
import OnboardingModal from '../../features/onboarding/components/OnboardingModal';
import StoryDraftModal from '../../features/story/components/StoryDraftModal';
import HomeScenarioModal from '../../features/home/components/HomeScenarioModal';
import { hasSeenOnboarding, markOnboardingSeen } from '../../features/onboarding/onboardingSeen';
import { useStoryGeneration } from '../../features/story/generation/useStoryGeneration';
import { getDraft } from '../../services/storiesApi';
import { getStories } from '../../services/libraryApi';
import { markOnboardingSeen as saveOnboardingSeen } from '../../services/meApi';
import avatarProfile from '../../assets/icons/avatar-profile.svg';
import iconPencil from '../../assets/icons/home-pencil.svg';
import mascotReading from '../../assets/images/home/mascot-reading.png';
import scenarioFriend from '../../assets/images/home/scenario-friend.png';
import scenarioEmotion from '../../assets/images/home/scenario-emotion.png';
import scenarioKindergarten from '../../assets/images/home/scenario-kindergarten.png';
import scenarioHabit from '../../assets/images/home/mascot-corner.png';
import styles from './DashboardPage.module.css';

const scenarios = [
  { id: 'friend', category: '친구 관계', accessibleTitle: '친구가 장난감을 빼앗았을 때', title: <>친구가 장난감을<br />빼앗았을 때</>, description: '아이에게 어떻게 말해줘야 할까요?', image: scenarioFriend, color: 'friend', accentColor: '#ff7c68' },
  { id: 'emotion', category: '감정 표현', accessibleTitle: '속상해도 아무 말 하지 않을 때', title: <>속상해도 아무 말<br />하지 않을 때</>, description: '아이의 마음을 어떻게 물어볼까요?', image: scenarioEmotion, color: 'emotion', accentColor: '#65d0a5' },
  { id: 'kindergarten', category: '새로운 환경', accessibleTitle: '유치원에 가기 싫다고 할 때', title: <>유치원에 가기<br />싫다고 할 때</>, description: '어떤 말로 안심시켜 줄까요?', image: scenarioKindergarten, color: 'kindergarten', accentColor: '#ffcf55' },
  { id: 'habit', category: '생활 습관', accessibleTitle: '실수하고 자꾸 숨기려고 할 때', title: <>실수하고 자꾸<br />숨기려고 할 때</>, description: '어떤 말로 안심시켜 줄까요?', image: scenarioHabit, color: 'habit', accentColor: '#9e95ff' },
];

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
        categoryLabel: draft?.situation?.categoryLabel ?? '',
        updatedAt: story.updatedAt,
      };
    }),
  );
}

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
                  disabled
                  title="준비 중"
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
          onOpenDraft={(draft) => navigate('/story/new', { state: { draftStoryId: draft.id } })}
        />
      )}
    </div>
  );
}

export default DashboardPage;
