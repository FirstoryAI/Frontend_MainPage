import { useEffect, useRef, useState } from 'react';
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
import CompleteStep from '../../features/story/components/CompleteStep';
import StoryDraftModal from '../../features/story/components/StoryDraftModal';
import ToneStep from '../../features/story/components/ToneStep';
import BlockedStep from '../../features/story/components/BlockedStep';
import GenerationFailedStep from '../../features/story/components/GenerationFailedStep';
import { STEP, SUMMARY_FALLBACK_GOAL, progressByStep } from '../../features/story/constants';
import {
  GENERATING_STATUSES,
  fromCategory,
  fromChild,
  fromSituationTiming,
  interestPairs,
  toChildProfile,
  toSituationRequest,
} from '../../features/story/storyMappers';
import { useStoryGeneration } from '../../features/story/generation/useStoryGeneration';
import { useNotifications } from '../../features/notifications/useNotifications';
import {
  answerInterview,
  confirmStory,
  createStory,
  deleteStory,
  getDraft,
  retryStory,
  saveChild as saveChildInfo,
  saveMessage,
  saveSituation,
  saveTone,
  startInterview,
} from '../../services/storiesApi';
import { getChildOptions, getChildren } from '../../services/childrenApi';
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

const FLOW_STEPS = ['situation', 'child', 'message'];
// 서버가 '넘어가기'를 계속 받아 줄 때 무한히 돌지 않도록 두는 한도예요.
const MAX_AUTO_SKIPS = 8;
const emptySession = () => ({ id: null, status: null, toneRequired: false, tone: null });

function StoryCreatePage() {
  const location = useLocation();
  const navigate = useNavigate();
  // 서재·미리보기에서 넘어올 때: 만들던 동화를 이어 만들거나(draftStoryId), 만드는 중 화면으로 바로 들어가요(generation).
  const draftStoryId = location.state?.draftStoryId ?? null;
  const generationStoryId = location.state?.generation?.storyId ?? null;

  const [step, setStep] = useState(generationStoryId ? STEP.GENERATING : STEP.SITUATION);
  // 지나온 단계 기록. 뒤로가기를 누르면 직전에 있던 단계로 돌아가요.
  const [history, setHistory] = useState([]);
  const [situation, setSituation] = useState('');
  const [detail, setDetail] = useState(initialDetail);
  const [child, setChild] = useState(initialChild);
  // 서버에 저장된 아이 프로필을 불러왔으면 그 id예요. 다음에도 쓰고 싶으면 saveChild를 켜요.
  const [savedChildId, setSavedChildId] = useState(null);
  const [saveChild, setSaveChild] = useState(false);
  const [interests, setInterests] = useState(() => interestPairs(null));
  const [topic, setTopic] = useState(initialTopic);
  // AI 인터뷰가 정리한 요약과, 마무리 화면에서 고친 '나누고 싶은 것'
  const [chatGoal, setChatGoal] = useState('');
  const [editedGoal, setEditedGoal] = useState('');
  // 인터뷰 질문·답변(채팅 화면에 보여줄 것)
  const [interviewTurns, setInterviewTurns] = useState([]);
  // 마무리 화면에서 고친 내용이 서버 동화와 달라졌는지. 달라졌으면 확정할 때 새로 보내요.
  const [stale, setStale] = useState(false);
  // 마무리 화면에서 열려 있는 수정 모달: 'child' | 'situation' | 'goal' | null
  const [editing, setEditing] = useState(null);
  const [exitPromptOpen, setExitPromptOpen] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(Boolean(draftStoryId));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [blocked, setBlocked] = useState(null);
  // 분위기 선택 단계가 열려 있으면 고른 값을 돌려줄 resolve 함수예요. 닫으면 null이에요.
  const [toneResolver, setToneResolver] = useState(null);
  const [selectedTone, setSelectedTone] = useState('');

  // 서버에 만들고 있는 동화. 화면 곳곳의 async 함수가 같은 값을 보도록 ref에 두고, id만 화면용으로 따로 보관해요.
  const session = useRef(emptySession());
  // 인터뷰에서 보낸 답(건너뛰면 null)을 순서대로 모아 둬요. 수정한 내용으로 동화를 다시 만들 때 같은 답을 다시 보내요.
  const interviewAnswers = useRef([]);
  const [storyId, setStoryId] = useState(generationStoryId);

  const { job, startGeneration } = useStoryGeneration();
  const { markRead } = useNotifications();

  const updateSession = (patch) => {
    session.current = { ...session.current, ...patch };
    if ('id' in patch) setStoryId(patch.id);
  };

  // 다른 단계로 넘어가면 항상 화면 맨 위부터 보여줘요. (좁은 화면에서 이전 스크롤이 남지 않게)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  // 만드는 중 화면으로 바로 들어오면 그 동화의 진행을 따라가요.
  useEffect(() => {
    if (generationStoryId) {
      session.current = { ...emptySession(), id: generationStoryId, status: 'REQUESTED' };
      startGeneration(generationStoryId);
    }
  }, [generationStoryId, startGeneration]);

  // 선택지와 저장해 둔 아이 프로필을 서버에서 가져와요. (이어 만드는 동화는 아래에서 따로 채워요)
  useEffect(() => {
    if (draftStoryId || generationStoryId) return undefined;

    let active = true;
    getChildOptions()
      .then((options) => active && setInterests(interestPairs(options)))
      .catch(() => {});
    getChildren()
      .then((children) => {
        if (!active || children.length === 0) return;
        setChild((current) => (current.birthYear ? current : fromChild(children[0]) ?? current));
        setSavedChildId(children[0].id);
        setSaveChild(true);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [draftStoryId, generationStoryId]);

  // 만들던 동화를 이어 만들 때: 서버에 저장된 입력을 불러와 알맞은 단계에서 시작해요.
  useEffect(() => {
    if (!draftStoryId) return undefined;

    let active = true;
    (async () => {
      try {
        const [draft, children] = await Promise.all([getDraft(draftStoryId), getChildren().catch(() => [])]);
        if (!active) return;

        updateSession({
          id: draft.storyId,
          status: draft.status,
          toneRequired: Boolean(draft.toneRequired),
          tone: draft.tone ?? null,
        });

        if (draft.situation) {
          setSituation(fromSituationTiming(draft.situation.timing));
          setDetail({
            category: fromCategory(draft.situation.category),
            event: draft.parent?.concern ?? '',
            reaction: draft.parent?.response ?? '',
          });
        }
        if (draft.child) {
          const saved = children.find((item) => item.id === draft.child.childId);
          setChild(fromChild(saved ?? draft.child) ?? initialChild);
          setSavedChildId(draft.child.childId ?? null);
        }
        const message = draft.parent?.message ?? '';
        setTopic({ message, undecided: !message && draft.status !== 'DRAFT' });
        setChatGoal(draft.interview?.summary ?? '');
        setInterviewTurns(draft.interview?.turns ?? []);
        interviewAnswers.current = (draft.interview?.turns ?? [])
          .filter((turn) => turn.answer !== undefined && turn.answer !== null)
          .map((turn) => turn.answer || null);

        const early = [STEP.SITUATION, STEP.DETAIL, STEP.CHILD, STEP.TOPIC];
        if (GENERATING_STATUSES.includes(draft.status)) {
          setStep(STEP.GENERATING);
          startGeneration(draft.storyId);
        } else if (draft.status === 'CONFIRMING') {
          setHistory(early);
          setStep(STEP.SUMMARY);
        } else if (draft.status === 'FAILED') {
          // 만들지 못한 동화는 입력 내용을 고쳐서 다시 만들 수 있게, 마무리 화면에서 새로 시작해요.
          setHistory(early);
          setStep(STEP.SUMMARY);
          setStale(true);
        } else if (draft.status === 'INTERVIEWING') {
          setHistory(early);
          setStep(STEP.CHAT);
        } else if (draft.status === 'DRAFT') {
          if (!draft.situation) setStep(STEP.SITUATION);
          else if (!draft.child) {
            setHistory([STEP.SITUATION, STEP.DETAIL]);
            setStep(STEP.CHILD);
          } else {
            setHistory([STEP.SITUATION, STEP.DETAIL, STEP.CHILD]);
            setStep(STEP.TOPIC);
          }
        } else {
          navigate('/library', { replace: true });
        }
      } catch {
        if (active) navigate('/home', { replace: true });
      } finally {
        if (active) setLoadingDraft(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [draftStoryId, navigate, startGeneration]);

  const merge = (setter) => (changes) => {
    setNotice('');
    setter((current) => ({ ...current, ...changes }));
  };

  const goTo = (next) => {
    setNotice('');
    setHistory((current) => [...current, step]);
    setStep(next);
  };

  const goBack = () => {
    const previous = history[history.length - 1];
    if (previous === undefined) {
      return;
    }
    setNotice('');
    setHistory(history.slice(0, -1));
    setStep(previous);
  };

  const canProceed = {
    [STEP.SITUATION]: Boolean(situation),
    [STEP.DETAIL]: Boolean(detail.category && detail.event.trim()),
    [STEP.CHILD]: Boolean(child.birthYear && child.birthMonth && child.gender),
    [STEP.TOPIC]: topic.undecided || Boolean(topic.message.trim()),
  }[step];

  // ---- 서버와 주고받기 ----

  // 서버 호출을 감싸요. 오류는 화면 아래 안내로 보여주고, 끝나면 버튼을 다시 눌러 볼 수 있게 해요.
  const run = async (task) => {
    setBusy(true);
    setNotice('');
    try {
      return await task();
    } catch (error) {
      setNotice(error.message || '잠시 문제가 생겼어요. 다시 시도해 주세요.');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const askTone = () => {
    setSelectedTone('');
    return new Promise((resolve) => setToneResolver(() => resolve));
  };

  // 분위기 선택 단계를 닫아요. 고른 분위기가 있으면 넘겨주고, 뒤로가기면 null이에요.
  const closeTone = (tone) => {
    toneResolver?.(tone);
    setToneResolver(null);
  };

  // 분위기를 골라 서버에 저장해요. 뒤로가기로 고르지 않으면 false예요.
  const pickTone = async () => {
    const tone = await askTone();
    if (!tone) return false;

    await saveTone(session.current.id, tone);
    updateSession({ tone });
    return true;
  };

  // 위기 신호 검사 결과를 처리해요. 계속 진행해도 되면 true예요.
  const checkSafety = async (response, { allowToneDialog = true } = {}) => {
    if (response.toneRequired) updateSession({ toneRequired: true });

    const safety = response.safety;
    if (!safety) return true;

    if (safety.action === 'BLOCK') {
      updateSession({ status: 'BLOCKED' });
      setBlocked(safety);
      return false;
    }
    if (safety.action === 'ASK_REVISE') {
      setNotice(safety.reason || '표현을 조금 바꿔서 다시 써 주세요.');
      return false;
    }
    if (safety.action === 'CHOOSE_TONE') {
      updateSession({ toneRequired: true });
      if (allowToneDialog && !(await pickTone())) return false;
    }
    return true;
  };

  // 서버에 이 단계까지 입력한 동화가 DRAFT로 있게 해요. 새로 만들었으면 true예요.
  // 인터뷰를 시작한 뒤에는 입력을 고칠 수 없어서, 이전 단계에서 바꾸면 지우고 새로 만들어요.
  const ensureDraftStory = async () => {
    const current = session.current;
    if (current.id && current.status === 'DRAFT') return false;

    if (current.id) await deleteStory(current.id).catch(() => {});
    const created = await createStory();
    updateSession({ ...emptySession(), id: created.storyId, status: created.status });
    return true;
  };

  const messageText = editedGoal.trim() || (topic.undecided ? '' : topic.message.trim());

  const putStep = (name) => {
    const id = session.current.id;
    if (name === 'situation') return saveSituation(id, toSituationRequest(situation, detail));
    if (name === 'child') {
      return saveChildInfo(id, {
        ...(savedChildId ? { childId: savedChildId } : {}),
        profile: toChildProfile(child, interests),
        saveForNextTime: saveChild,
      });
    }
    return saveMessage(id, messageText);
  };

  // upto 단계까지 서버에 저장해요. 새로 만든 동화면 앞 단계도 모두 보내요.
  const syncStory = async (upto, retried = false) => {
    try {
      const fresh = await ensureDraftStory();
      for (const name of FLOW_STEPS.slice(0, FLOW_STEPS.indexOf(upto) + 1)) {
        if (!fresh && name !== upto) continue;
        if (!(await checkSafety(await putStep(name)))) return false;
      }
      return true;
    } catch (error) {
      // 다른 곳에서 지워졌거나 상태가 바뀐 동화면 새로 만들어서 한 번 더 시도해요.
      if (!retried && (error.status === 404 || error.status === 409)) {
        updateSession(emptySession());
        return syncStory(upto, true);
      }
      throw error;
    }
  };

  // 인터뷰를 시작해요. 'chat' | 'summary' | null을 돌려줘요.
  // mode: 'chat' 채팅으로 답하기 / 'skip' 질문을 모두 건너뛰고 요약까지 / 'replay' 이전에 한 답을 그대로 다시 보내고 요약까지
  const runInterview = async ({ mode }) => {
    const id = session.current.id;
    let response = await startInterview(id);
    updateSession({ status: response.status });
    if (!(await checkSafety(response, { allowToneDialog: false }))) return null;

    if (mode === 'chat') {
      interviewAnswers.current = [];
      setInterviewTurns([{ question: response.question }]);
      return 'chat';
    }

    const queue = mode === 'replay' ? [...interviewAnswers.current] : [];
    interviewAnswers.current = [];
    for (let count = 0; response.type === 'QUESTION' && count < MAX_AUTO_SKIPS; count += 1) {
      const answer = queue.length > 0 ? queue.shift() : null;
      response = await answerInterview(id, answer);
      // 같은 답이 다시 쓰기 안내를 받으면 그 질문은 건너뛰어요.
      if (answer !== null && response.safety?.action === 'ASK_REVISE') response = await answerInterview(id, null);
      else interviewAnswers.current.push(answer);
      if (!(await checkSafety(response, { allowToneDialog: false }))) return null;
    }
    if (response.type !== 'CONFIRM') throw new Error('이야기를 정리하지 못했어요. 다시 시도해 주세요.');

    updateSession({ status: response.status });
    setChatGoal(response.summary ?? '');
    return 'summary';
  };

  const handleNext = async () => {
    if (busy) return;

    if (step === STEP.DETAIL) {
      if (await run(() => syncStory('situation'))) goTo(STEP.CHILD);
      return;
    }
    if (step === STEP.CHILD) {
      if (await run(() => syncStory('child'))) goTo(STEP.TOPIC);
      return;
    }
    if (step === STEP.TOPIC) {
      // '아직 잘 모르겠어요'는 AI 인터뷰로 정리하고, 직접 적었다면 바로 마무리 화면으로 가요.
      setEditedGoal('');
      setStale(false);
      const next = await run(async () => {
        if (!(await syncStory('message'))) return null;
        return runInterview({ mode: topic.undecided ? 'chat' : 'skip' });
      });
      if (next === 'chat') goTo(STEP.CHAT);
      else if (next === 'summary') goTo(STEP.SUMMARY);
      return;
    }
    goTo(step + 1);
  };

  const handleChatFinish = (summary) => {
    updateSession({ status: 'CONFIRMING' });
    setChatGoal(summary);
    setEditedGoal('');
    setStale(false);
    goTo(STEP.SUMMARY);
  };

  // 서버는 인터뷰를 시작한 뒤에는 입력 수정을 받지 않아요.
  // 그래서 마무리 화면에서 고친 내용으로 새 동화를 만들고, 앞서 인터뷰에서 한 답을 그대로 다시 보내 요약까지 받아요.
  const rebuildStory = async () => {
    if (!(await syncStory('message'))) return false;
    return (await runInterview({ mode: 'replay' })) === 'summary';
  };

  const handleStartGeneration = async () => {
    if (busy) return;

    const started = await run(async () => {
      if (stale) {
        if (!(await rebuildStory())) return false;
        setStale(false);
      }

      const id = session.current.id;
      if (session.current.toneRequired && !session.current.tone && !(await pickTone())) return false;

      try {
        await confirmStory(id);
      } catch (error) {
        if (error.code !== 'TONE_REQUIRED') throw error;
        if (!(await pickTone())) return false;
        await confirmStory(id);
      }
      return true;
    });

    if (started) {
      startGeneration(session.current.id);
      goTo(STEP.GENERATING);
    }
  };

  const handleRetry = async () => {
    const id = session.current.id ?? storyId;
    if (!id || busy) return;

    const retried = await run(() => retryStory(id));
    if (retried) startGeneration(id);
  };

  // 만들지 못한 동화는 입력 내용을 불러와 마무리 화면에서 고친 뒤 다시 만들어요.
  const handleEditInputs = () => {
    const id = session.current.id ?? storyId;
    if (id) navigate('/story/new', { state: { draftStoryId: id } });
  };

  const closeEditing = () => setEditing(null);

  const handleSaveChild = (changes) => {
    setChild((current) => ({ ...current, ...changes }));
    setStale(true);
    closeEditing();
  };

  const handleSaveSituation = (event) => {
    setDetail((current) => ({ ...current, event }));
    setStale(true);
    closeEditing();
  };

  const handleSaveGoal = (goal) => {
    setEditedGoal(goal);
    setStale(true);
    closeEditing();
  };

  // 서버는 입력할 때마다 만들던 동화를 저장해 두므로, '저장할게요'는 그대로 나가면 돼요.
  const handleDiscard = async () => {
    const id = session.current.id;
    if (id) await deleteStory(id).catch(() => {});
    navigate('/home');
  };

  const derivedGoal = chatGoal || (topic.undecided ? '' : topic.message.trim()) || SUMMARY_FALLBACK_GOAL;
  const summaryGoal = editedGoal || derivedGoal;

  const activeJob = job && job.storyId === storyId ? job : null;
  // 동화 만드는 중 화면에 있다가 제작이 끝나면 제작 완료 화면으로 넘어가요.
  const visibleStep = step === STEP.GENERATING && activeJob?.status === 'done' ? STEP.COMPLETE : step;
  const completedNotificationId = visibleStep === STEP.COMPLETE ? activeJob.notificationId : null;

  // 완료 화면을 직접 봤다면 같은 내용의 알림은 읽은 것으로 해요.
  useEffect(() => {
    if (completedNotificationId) markRead(completedNotificationId);
  }, [completedNotificationId, markRead]);

  const toneOpen = Boolean(toneResolver);

  // 만드는 중·제작 완료 화면은 진행 바와 아래 버튼 없이 로고만 있는 헤더를 써요.
  const progress = visibleStep >= STEP.GENERATING ? null : progressByStep[toneOpen ? STEP.SITUATION : step];
  const showFooter = step !== STEP.CHAT && step < STEP.GENERATING;

  // 위기 신호가 있어 동화를 만들 수 없을 때는 안내 화면만 보여줘요.
  if (blocked) {
    return <BlockedStep onHome={handleDiscard} />;
  }

  if (loadingDraft) {
    return (
      <div className={styles.page}>
        <StoryHeader progress={null} onExit={() => {}} />
        <p className={styles.loading} role="status">
          만들던 이야기를 불러오는 중이에요.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <StoryHeader progress={progress} onExit={() => setExitPromptOpen(true)} />

      <main className={styles.main} inert={editing !== null}>
        {toneOpen && <BackButton onClick={() => closeTone(null)} />}
        {!toneOpen && step > STEP.SITUATION && step < STEP.GENERATING && <BackButton onClick={goBack} />}

        {toneOpen && <ToneStep category={detail.category} selected={selectedTone} onSelect={setSelectedTone} />}

        {!toneOpen && step === STEP.SITUATION && (
          <SituationStep selected={situation} onSelect={setSituation} />
        )}
        {!toneOpen && step === STEP.DETAIL && (
          <DetailStep detail={detail} onChange={merge(setDetail)} />
        )}
        {!toneOpen && step === STEP.CHILD && (
          <ChildInfoStep child={child} onChange={merge(setChild)} />
        )}
        {!toneOpen && step === STEP.TOPIC && (
          <TopicStep
            category={detail.category}
            topic={topic}
            onChange={merge(setTopic)}
          />
        )}
        {!toneOpen && step === STEP.CHAT && (
          <ChatStep
            storyId={storyId}
            turns={interviewTurns}
            onFinish={handleChatFinish}
            onSafety={setBlocked}
            onAnswered={(answer) => interviewAnswers.current.push(answer)}
          />
        )}
        {!toneOpen && step === STEP.SUMMARY && (
          <SummaryStep
            child={child}
            situation={detail.event.trim()}
            goal={summaryGoal}
            onEditChild={() => setEditing('child')}
            onEditSituation={() => setEditing('situation')}
            onEditGoal={() => setEditing('goal')}
          />
        )}
        {!toneOpen && visibleStep === STEP.GENERATING && activeJob?.status === 'failed' && (
          <GenerationFailedStep onRetry={handleRetry} onEdit={handleEditInputs} busy={busy} />
        )}
        {!toneOpen && visibleStep === STEP.GENERATING && activeJob?.status !== 'failed' && (
          <GeneratingStep stage={activeJob?.stage ?? 0} />
        )}
        {!toneOpen && visibleStep === STEP.COMPLETE && <CompleteStep title={activeJob.title} />}
      </main>

      {toneOpen && (
        <footer className={styles.footer}>
          <CtaButton pill disabled={!selectedTone} onClick={() => closeTone(selectedTone)}>
            다음
          </CtaButton>
        </footer>
      )}

      {!toneOpen && showFooter && (
        <footer
          className={`${styles.footer} ${step === STEP.SUMMARY ? styles.summaryFooter : ''}`}
          inert={editing !== null}
        >
          {notice && (
            <p className={styles.error} role="alert">
              {notice}
            </p>
          )}
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
            <CtaButton pill disabled={busy} onClick={handleStartGeneration}>
              {busy ? '준비하는 중…' : '동화 만들기'}
            </CtaButton>
          ) : (
            <CtaButton pill disabled={!canProceed || busy} onClick={handleNext}>
              {busy ? '저장하는 중…' : '다음'}
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
          onSave={() => navigate('/home')}
          onDiscard={handleDiscard}
        />
      )}
    </div>
  );
}

export default StoryCreatePage;
