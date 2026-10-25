import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import CtaButton from '../../components/ui/CtaButton';
import StoryHeader from '../../features/story/components/StoryHeader';
import BackButton from '../../features/story/components/BackButton';
import SituationStep from '../../features/story/components/SituationStep';
import DetailStep from '../../features/story/components/DetailStep';
import ChildInfoStep from '../../features/story/components/ChildInfoStep';
import TopicStep from '../../features/story/components/TopicStep';
import ChatStep from '../../features/story/components/ChatStep';
import SummaryStep from '../../features/story/components/SummaryStep';
import ChildEditModal from '../../features/story/components/ChildEditModal';
import TextEditModal from '../../features/story/components/TextEditModal';
import GeneratingStep from '../../features/story/components/GeneratingStep';
import StoryDraftModal from '../../features/story/components/StoryDraftModal';
import { STEP, SUMMARY_FALLBACK_GOAL, progressByStep } from '../../features/story/constants';
import { deleteStoryDraft, saveStoryDraft } from '../../features/story/drafts';
import { loadChildProfile, saveChildProfile } from '../../features/profile/childProfile';
import iconNotice from '../../assets/icons/icon-notice.svg';
import styles from './StoryCreatePage.module.css';

const initialDetail = { category: '', event: '', reaction: '' };
const initialChild = {
  birthYear: '',
  birthMonth: '',
  gender: '',
  traits: [],
  customTrait: '',
  likes: '',
};
const initialTopic = { message: '', undecided: false };

function StoryCreatePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isRemake = Boolean(location.state?.remake);
  const resumeDraft = location.state?.draft ?? null;
  const [step, setStep] = useState(() =>
    resumeDraft?.step ?? (isRemake ? STEP.GENERATING : STEP.SITUATION),
  );
  // 지나온 단계 기록. 뒤로가기를 누르면 직전에 있던 단계로 돌아가요.
  const [history, setHistory] = useState(() => resumeDraft?.history ?? []);
  const [situation, setSituation] = useState(() => resumeDraft?.situation ?? '');
  const [detail, setDetail] = useState(() => resumeDraft?.detail ?? initialDetail);
  const [child, setChild] = useState(() => resumeDraft?.child ?? loadChildProfile({ includeSession: false }) ?? initialChild);
  const [saveChild, setSaveChild] = useState(() => resumeDraft?.saveChild ?? false);
  const [topic, setTopic] = useState(() => resumeDraft?.topic ?? initialTopic);
  // 채팅에서 보호자가 답한 내용. 채팅을 건너뛰면 비어 있어요.
  const [chatGoal, setChatGoal] = useState(() => resumeDraft?.chatGoal ?? '');
  // 마무리 화면에서 고친 '나누고 싶은 것'. 비어 있으면 위의 답변·직접 적은 글을 그대로 보여줘요.
  const [editedGoal, setEditedGoal] = useState(() => resumeDraft?.editedGoal ?? '');
  // 마무리 화면에서 열려 있는 수정 모달: 'child' | 'situation' | 'goal' | null
  const [editing, setEditing] = useState(null);
  const [exitPromptOpen, setExitPromptOpen] = useState(false);

  // 다른 단계로 넘어가면 항상 화면 맨 위부터 보여줘요. (좁은 화면에서 이전 스크롤이 남지 않게)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  useEffect(() => {
    if (child.birthYear || child.birthMonth || child.gender || child.traits?.length || child.customTrait || child.likes) {
      saveChildProfile(child, { persist: saveChild });
    }
  }, [child, saveChild]);

  const merge = (setter) => (changes) =>
    setter((current) => ({ ...current, ...changes }));

  const goTo = (next) => {
    setHistory((current) => [...current, step]);
    setStep(next);
  };

  const goBack = () => {
    const previous = history[history.length - 1];
    if (previous === undefined) {
      return;
    }
    setHistory(history.slice(0, -1));
    setStep(previous);
  };

  const canProceed = {
    [STEP.SITUATION]: Boolean(situation),
    [STEP.DETAIL]: Boolean(detail.category && detail.event.trim()),
    [STEP.CHILD]: Boolean(child.birthYear && child.birthMonth && child.gender),
    [STEP.TOPIC]: topic.undecided || Boolean(topic.message.trim()),
  }[step];

  const handleNext = () => {
    if (step === STEP.TOPIC) {
      // '아직 잘 모르겠어요'는 AI 채팅으로 정리하고, 직접 적었다면 바로 마무리 화면으로 가요.
      setChatGoal('');
      setEditedGoal('');
      goTo(topic.undecided ? STEP.CHAT : STEP.SUMMARY);
      return;
    }
    goTo(step + 1);
  };

  const handleChatFinish = (goal) => {
    setChatGoal(goal ?? '');
    setEditedGoal('');
    goTo(STEP.SUMMARY);
  };

  const closeEditing = () => setEditing(null);

  const handleSaveChild = (changes) => {
    setChild((current) => ({ ...current, ...changes }));
    closeEditing();
  };

  const handleSaveSituation = (event) => {
    setDetail((current) => ({ ...current, event }));
    closeEditing();
  };

  const handleSaveGoal = (goal) => {
    setEditedGoal(goal);
    closeEditing();
  };

  const handleSaveDraft = () => {
    saveStoryDraft({
      id: resumeDraft?.id,
      step,
      history,
      situation,
      detail,
      child,
      saveChild,
      topic,
      chatGoal,
      editedGoal,
    });
    navigate('/home');
  };

  const derivedGoal = topic.undecided
    ? chatGoal || SUMMARY_FALLBACK_GOAL
    : topic.message.trim() || SUMMARY_FALLBACK_GOAL;
  const summaryGoal = editedGoal || derivedGoal;

  const progress = step === STEP.GENERATING ? null : progressByStep[step];
  const showFooter = step !== STEP.CHAT && step !== STEP.GENERATING;

  return (
    <div className={styles.page}>
      <StoryHeader progress={progress} onExit={() => setExitPromptOpen(true)} />

      <main className={styles.main} inert={editing !== null}>
        {step > STEP.SITUATION && step !== STEP.GENERATING && <BackButton onClick={goBack} />}

        {step === STEP.SITUATION && (
          <SituationStep selected={situation} onSelect={setSituation} />
        )}
        {step === STEP.DETAIL && (
          <DetailStep detail={detail} onChange={merge(setDetail)} />
        )}
        {step === STEP.CHILD && (
          <ChildInfoStep child={child} onChange={merge(setChild)} />
        )}
        {step === STEP.TOPIC && (
          <TopicStep
            category={detail.category}
            topic={topic}
            onChange={merge(setTopic)}
          />
        )}
        {step === STEP.CHAT && (
          <ChatStep category={detail.category} onFinish={handleChatFinish} />
        )}
        {step === STEP.SUMMARY && (
          <SummaryStep
            child={child}
            situation={detail.event.trim()}
            goal={summaryGoal}
            onEditChild={() => setEditing('child')}
            onEditSituation={() => setEditing('situation')}
            onEditGoal={() => setEditing('goal')}
          />
        )}
        {step === STEP.GENERATING && (
          <GeneratingStep
            onComplete={() => {
              if (resumeDraft?.id) deleteStoryDraft(resumeDraft.id);
              navigate('/story/preview', {
                state: {
                  story: location.state?.story ?? {
                    description: detail.event.trim() || '친구와 블록을 만들며 생긴 이야기예요.',
                    parentGuide: summaryGoal,
                  },
                  canRemake: !isRemake,
                },
              });
            }}
          />
        )}
      </main>

      {showFooter && (
        <footer
          className={`${styles.footer} ${step === STEP.SUMMARY ? styles.summaryFooter : ''}`}
          inert={editing !== null}
        >
          {step === STEP.CHILD && (
            <label className={styles.saveToggle}>
              <input
                type="checkbox"
                checked={saveChild}
                onChange={(event) => setSaveChild(event.target.checked)}
              />
              다음에도 이 아이 정보로 만들기
            </label>
          )}
          {step === STEP.SUMMARY && (
            <p className={styles.note}>
              <img src={iconNotice} alt="" />
              아이와 비슷한 일을 겪는 동물 친구의 이야기로 만들어요. 아이 이름은 동화에 나오지 않아요.
            </p>
          )}
          {step === STEP.SUMMARY ? (
            <CtaButton pill onClick={() => goTo(STEP.GENERATING)}>
              동화 만들기
            </CtaButton>
          ) : (
            <CtaButton pill disabled={!canProceed} onClick={handleNext}>
              다음
            </CtaButton>
          )}
        </footer>
      )}

      {editing === 'child' && (
        <ChildEditModal child={child} onSave={handleSaveChild} onClose={closeEditing} />
      )}
      {editing === 'situation' && (
        <TextEditModal
          title="상황"
          titleId="situation-edit-title"
          label="상황"
          initialValue={detail.event.trim()}
          onSave={handleSaveSituation}
          onClose={closeEditing}
        />
      )}
      {editing === 'goal' && (
        <TextEditModal
          title="이번 이야기에서 나누고 싶은 것"
          titleId="goal-edit-title"
          label="이번 이야기에서 나누고 싶은 것"
          initialValue={summaryGoal}
          onSave={handleSaveGoal}
          onClose={closeEditing}
        />
      )}
      {exitPromptOpen && (
        <StoryDraftModal
          mode="exit"
          onClose={() => setExitPromptOpen(false)}
          onSave={handleSaveDraft}
          onDiscard={() => navigate('/home')}
        />
      )}
    </div>
  );
}

export default StoryCreatePage;
