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
import { STEP, SUMMARY_FALLBACK_GOAL, progressByStep, toneProgress } from '../../features/story/constants';
import {
  GENERATING_STATUSES,
  fromCategory,
  fromChild,
  fromSituationTiming,
  interestPairs,
  toChildProfile,
  toSituationRequest,
} from '../../features/story/storyMappers';
import { extractChoices } from '../../features/story/interviewChoices';
import { useStoryGeneration } from '../../features/story/generation/useStoryGeneration';
import { useNotifications } from '../../features/notifications/useNotifications';
import {
  answerInterview,
  confirmStory,
  createStory,
  deleteStory,
  getDraft,
  saveChild as saveChildInfo,
  saveMessage,
  saveSituation,
  saveSummary,
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
// 서버가 '입력 내용·AI 인터뷰가 이전 동화와 거의 같다'고 알려 줄 때의 오류 코드예요. (백엔드와 정해야 하는 값이라, 정해지면 여기만 바꿔요.)
// 동화 만들기를 눌렀을 때 이 코드가 오면 '동화를 만들지 못했어요' 화면을 보여줘요. 글·그림을 만들다 실패한 경우에는 이 화면을 쓰지 않아요.
const SIMILAR_STORY_CODES = ['DUPLICATE_STORY'];
// 서버가 '넘어가기'를 계속 받아 줄 때 무한히 돌지 않도록 두는 한도예요.
const MAX_AUTO_SKIPS = 8;
// '이번 이야기에서 나누고 싶은 것'은 서버가 1~300자만 받아요.
const GOAL_MAX_LENGTH = 300;
const emptySession = () => ({ id: null, status: null, toneRequired: false, tone: null });

// 인터뷰를 한 때와 입력이 달라졌는지 비교하려고 상황·아이·전하고 싶은 말을 한 줄로 만들어요.
function inputsKey({ situation, detail, child, undecided, message }) {
  return JSON.stringify([situation, detail, child, undecided, message]);
}

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
  // 서버가 정리한 '이번 이야기에서 나누고 싶은 것'(부모에게 그대로 보여 주는 문장)
  const [chatGoal, setChatGoal] = useState('');
  // 인터뷰 질문·답변(채팅 화면에 보여줄 것)
  const [interviewTurns, setInterviewTurns] = useState([]);
  const [interviewChoices, setInterviewChoices] = useState([]);
  // 뒤로 갔다 돌아와도 같은 대화가 보이도록 채팅 화면이 보낸 대화 기록을 담아 둬요. 인터뷰가 끝났으면 보기만 해요.
  const [chatLog, setChatLog] = useState(null);
  const [interviewDone, setInterviewDone] = useState(false);
  // AI 인터뷰를 거친 동화인지예요. 만들지 못했을 때 안내 문구가 달라져요. (이어 만드는 동화는 서버에 남은 답으로 알아요)
  const [hadInterview, setHadInterview] = useState(true);
  // 만들지 못한 동화를 이어 고칠 때처럼 서버 동화가 더 이상 고칠 수 없는 상태면, 확정할 때 새로 만들어 보내요.
  const [needsRecreate, setNeedsRecreate] = useState(false);
  // 마무리 화면에서 열려 있는 수정 모달: 'child' | 'situation' | 'goal' | null
  const [editing, setEditing] = useState(null);
  const [exitPromptOpen, setExitPromptOpen] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(Boolean(draftStoryId));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [blocked, setBlocked] = useState(null);
  // 이전 동화와 거의 같은 내용이라 만들지 못했을 때 true예요.
  const [similarStory, setSimilarStory] = useState(false);
  // 분위기 선택 단계가 열려 있으면 고른 값을 돌려줄 resolve 함수예요. 닫으면 null이에요.
  const [toneResolver, setToneResolver] = useState(null);
  const [selectedTone, setSelectedTone] = useState('');

  // 서버에 만들고 있는 동화. 화면 곳곳의 async 함수가 같은 값을 보도록 ref에 두고, id만 화면용으로 따로 보관해요.
  const session = useRef(emptySession());
  // '동화 만들기'(또는 다시 만들기)를 누른 동안에만 true예요. 아이 안전 안내 화면은 이때만 보여줘요.
  const startingGeneration = useRef(false);
  // 입력을 저장할 때 서버가 막았다고(BLOCK) 알려 주면, 그때의 입력을 기억해 둬요. 화면에는 아무것도 보여주지 않고,
  // 같은 입력으로 '동화 만들기'를 눌렀을 때 비로소 안내 화면을 보여줘요. 입력이 바뀌면 다시 서버에 보내 새로 판단해요.
  const blockedKey = useRef(null);
  // 마지막으로 인터뷰한 때의 입력(상황·아이·전하고 싶은 말)이에요. 뒤로 가서 이 입력이 바뀌면 인터뷰를 새로 해요.
  const interviewedKey = useRef(null);
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
        const undecided = !message && draft.status !== 'DRAFT';
        setTopic({ message, undecided });
        setChatGoal(draft.interview?.summary ?? '');
        setInterviewTurns(draft.interview?.turns ?? []);
        setInterviewDone(draft.status === 'CONFIRMING');
        setHadInterview(Boolean(draft.interview?.turns?.some((turn) => turn.answer)));
        if (draft.status === 'INTERVIEWING' || draft.status === 'CONFIRMING') {
          interviewedKey.current = inputsKey({
            situation: draft.situation ? fromSituationTiming(draft.situation.timing) : '',
            detail: draft.situation
              ? {
                  category: fromCategory(draft.situation.category),
                  event: draft.parent?.concern ?? '',
                  reaction: draft.parent?.response ?? '',
                }
              : initialDetail,
            child: draft.child
              ? fromChild(children.find((item) => item.id === draft.child.childId) ?? draft.child) ?? initialChild
              : initialChild,
            undecided,
            message,
          });
        }

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
          setNeedsRecreate(true);
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
      // 동화 만들기를 눌렀을 때 서버가 이 내용으로는 만들 수 없다고 하면(검토 기준에 어긋남) 안내 화면을 보여줘요.
      if (SIMILAR_STORY_CODES.includes(error.code) && startingGeneration.current) {
        setSimilarStory(true);
        return null;
      }
      if (error.code === 'STORY_BLOCKED' && startingGeneration.current) {
        updateSession({ status: 'BLOCKED' });
        setBlocked({});
        return null;
      }
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

    if (!isHiddenBlocked()) await saveTone(session.current.id, tone);
    updateSession({ tone });
    return true;
  };

  // 위기 신호 검사 결과를 처리해요. 계속 진행해도 되면 true예요.
  // 입력을 저장할 때 서버가 막아도(BLOCK) 입력 단계에서는 아무것도 보여주지 않아요. 아이 안전 안내 화면은 '동화 만들기'를 눌렀을 때만 보여줘요.
  // 막힌 동화는 서버에 더 보낼 수 없어서, 입력이 그대로인 동안은 서버 호출 없이 화면만 이어가요(isHiddenBlocked).
  // 분위기 선택(CHOOSE_TONE)은 서버 판단으로 띄우지 않아요. 이별·죽음 상황에서만 따로 물어봐요.
  const checkSafety = (response, changed = {}) => {
    if (response.toneRequired) updateSession({ toneRequired: true });

    const safety = response.safety;
    if (!safety) return true;

    if (safety.action === 'BLOCK') {
      updateSession({ status: 'BLOCKED' });
      if (startingGeneration.current) {
        setBlocked(safety);
        return false;
      }
      // 입력 단계에서는 아무것도 보여주지 않고 이어가요. 안내 화면은 '동화 만들기'를 눌렀을 때만 보여줘요.
      blockedKey.current = currentKey(changed);
    }
    if (safety.action === 'ASK_REVISE') {
      setNotice(safety.reason || '표현을 조금 바꿔서 다시 써 주세요.');
      return false;
    }
    if (safety.action === 'CHOOSE_TONE') updateSession({ toneRequired: true });
    return true;
  };

  // 서버가 분위기를 꼭 골라야 한다고 하는데 이 화면에서는 고르지 않았다면, '아직 잘 모르겠어요'(부드럽게 만들기)로 정해 둬요.
  const ensureTone = async () => {
    if (session.current.tone) return;
    await saveTone(session.current.id, 'UNDECIDED');
    updateSession({ tone: 'UNDECIDED' });
  };

  // 서버에 이 단계까지 입력한 동화가 DRAFT로 있게 해요. 새로 만들었으면 true예요.
  // 인터뷰를 시작한 동화는 뒤로 가서 입력이 바뀌면 인터뷰도 다시 해야 해서, 지우고 새로 만들어요.
  const ensureDraftStory = async () => {
    const current = session.current;
    if (current.id && current.status === 'DRAFT') return false;

    if (current.id) await deleteStory(current.id).catch(() => {});
    const created = await createStory();
    updateSession({ ...emptySession(), id: created.storyId, status: created.status });
    return true;
  };

  const currentKey = (changed = {}) =>
    inputsKey({ situation, detail, child, undecided: topic.undecided, message: topic.message, ...changed });

  const isHiddenBlocked = () => blockedKey.current !== null && blockedKey.current === currentKey();

  const messageText = topic.undecided ? '' : topic.message.trim();

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
    if (isHiddenBlocked()) return true;

    try {
      blockedKey.current = null;
      const fresh = await ensureDraftStory();
      for (const name of FLOW_STEPS.slice(0, FLOW_STEPS.indexOf(upto) + 1)) {
        if (!fresh && name !== upto) continue;
        if (!(await checkSafety(await putStep(name)))) return false;
        if (isHiddenBlocked()) return true;
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
  // mode: 'chat' 채팅으로 답하기 / 'skip' 질문을 모두 건너뛰고 요약까지
  // 서버는 질문 없이 바로 CONFIRM을 줄 수도 있어요(질문은 0~5개). 그때는 채팅을 열지 않고 마무리 화면으로 가요.
  const runInterview = async ({ mode }) => {
    // 입력 단계에서 막힌 동화는 AI 인터뷰 없이 마무리 화면으로 가요. 여기서 '동화 만들기'를 누르면 안내 화면이 나와요.
    if (isHiddenBlocked()) {
      setChatGoal('');
      setInterviewDone(true);
      return 'summary';
    }

    const id = session.current.id;
    let response = await startInterview(id);
    updateSession({ status: response.status });
    setChatLog(null);
    setInterviewDone(false);
    if (!checkSafety(response)) return null;

    if (mode === 'chat' && response.type === 'QUESTION') {
      setInterviewTurns([{ question: response.question }]);
      setInterviewChoices(extractChoices(response));
      return 'chat';
    }

    for (let count = 0; response.type === 'QUESTION' && count < MAX_AUTO_SKIPS; count += 1) {
      response = await answerInterview(id, null);
      if (!checkSafety(response)) return null;
    }
    if (response.type !== 'CONFIRM') throw new Error('이야기를 정리하지 못했어요. 다시 시도해 주세요.');

    updateSession({ status: response.status });
    setChatGoal(response.summary ?? '');
    setInterviewDone(true);
    return 'summary';
  };

  const handleNext = async () => {
    if (busy) return;

    // 인터뷰를 한 뒤 뒤로 와서 입력을 하나도 안 바꿨다면 서버에 다시 저장하지 않고 그대로 이어가요.
    const interviewKept =
      ['INTERVIEWING', 'CONFIRMING'].includes(session.current.status) && interviewedKey.current === currentKey();

    if (step === STEP.DETAIL) {
      const saved =
        interviewKept ||
        (await run(async () => {
          if (!(await syncStory('situation'))) return false;
          // 이별·죽음 이야기는 서버가 분위기 선택을 따로 요구하지 않아도, 부모가 먼저 분위기를 고르고 다음으로 가요.
          if (detail.category === '이별 · 죽음' && !session.current.tone && !(await pickTone())) return false;
          return true;
        }));
      if (saved) goTo(STEP.CHILD);
      return;
    }
    if (step === STEP.CHILD) {
      if (interviewKept || (await run(() => syncStory('child')))) goTo(STEP.TOPIC);
      return;
    }
    if (step === STEP.TOPIC) {
      if (interviewKept) {
        // 채팅으로 정리한 동화는 그 대화를 다시 보여주고, 직접 적은 동화는 바로 마무리 화면으로 가요.
        goTo(topic.undecided ? STEP.CHAT : STEP.SUMMARY);
        return;
      }
      // 입력이 새로 바뀌었으면 인터뷰를 새로 해요. '아직 잘 모르겠어요'는 AI 채팅으로, 직접 적었다면 바로 마무리 화면으로 가요.
      const next = await run(async () => {
        if (!(await syncStory('message'))) return null;
        return runInterview({ mode: topic.undecided ? 'chat' : 'skip' });
      });
      if (next) {
        interviewedKey.current = currentKey();
        setHadInterview(topic.undecided);
        setNeedsRecreate(false);
      }
      if (next === 'chat') goTo(STEP.CHAT);
      else if (next === 'summary') goTo(STEP.SUMMARY);
      return;
    }
    goTo(step + 1);
  };

  // 인터뷰 답이 막혔을 때: 아무것도 보여주지 않고 인터뷰를 마친 것처럼 마무리 화면으로 가요. '동화 만들기'를 누르면 안내 화면이 나와요.
  const handleChatBlocked = () => {
    updateSession({ status: 'BLOCKED' });
    blockedKey.current = currentKey();
    setChatGoal('');
    setInterviewDone(true);
    setNeedsRecreate(false);
    goTo(STEP.SUMMARY);
  };

  const handleChatFinish = (summary) => {
    updateSession({ status: 'CONFIRMING' });
    setInterviewDone(true);
    setChatGoal(summary);
    setNeedsRecreate(false);
    goTo(STEP.SUMMARY);
  };

  // 만들지 못한 동화는 서버에서 더 고칠 수 없어요. 화면의 내용으로 새 동화를 만들고, 화면에 보이던 '나누고 싶은 것'을 그대로 저장해요.
  const recreateStory = async () => {
    const keptGoal = chatGoal;
    if (!(await syncStory('message'))) return false;
    if ((await runInterview({ mode: 'skip' })) !== 'summary') return false;
    if (keptGoal) {
      const saved = await saveSummary(session.current.id, keptGoal);
      if (saved.safety?.action === 'ASK_REVISE') {
        setNotice(saved.safety.reason || '나누고 싶은 것의 표현을 조금 바꿔 주세요.');
        return false;
      }
      setChatGoal(keptGoal);
    }
    return true;
  };

  const handleStartGeneration = async () => {
    if (busy) return;

    // 입력 단계에서 서버가 막은 내용 그대로라면, 여기서 안내 화면을 보여줘요.
    if (isHiddenBlocked() && !needsRecreate) {
      setBlocked({});
      return;
    }

    startingGeneration.current = true;
    const started = await run(async () => {
      if (needsRecreate) {
        if (!(await recreateStory())) return false;
        interviewedKey.current = currentKey();
        setNeedsRecreate(false);
      }

      const id = session.current.id;
      if (session.current.toneRequired) await ensureTone();

      try {
        await confirmStory(id);
      } catch (error) {
        if (error.code !== 'TONE_REQUIRED') throw error;
        await ensureTone();
        await confirmStory(id);
      }
      return true;
    });
    startingGeneration.current = false;

    if (started) {
      startGeneration(session.current.id);
      goTo(STEP.GENERATING);
    }
  };

  // 만들지 못한 동화는 입력 내용을 불러와 마무리 화면에서 고친 뒤 다시 만들어요.
  const handleEditInputs = () => {
    const id = session.current.id ?? storyId;
    if (id) navigate('/story/new', { state: { draftStoryId: id } });
  };

  const closeEditing = () => setEditing(null);

  // 마무리 화면에서 고친 내용을 바로 서버에 저장해요. 저장되지 않으면 이유를 돌려줘서 수정 창에 보여줘요(저장되면 '').
  // 만들지 못한 동화를 이어 고치는 중이면 서버에는 아직 보내지 않고, 동화 만들기를 누를 때 새 동화로 한꺼번에 보내요.
  const saveEdit = async (put, commit, changed = {}) => {
    let response = null;
    // 막힌 동화는 서버에 더 고쳐 보낼 수 없어서 화면만 고치고, 동화 만들기를 누를 때 새로 만들어 보내요.
    const localOnly = needsRecreate || isHiddenBlocked();
    if (!localOnly) {
      try {
        response = await put(session.current.id);
      } catch (error) {
        return error.message || '저장하지 못했어요. 잠시 뒤에 다시 시도해 주세요.';
      }
      if (response.safety?.action === 'ASK_REVISE') {
        return response.safety.reason || '표현을 조금 바꿔서 다시 써 주세요.';
      }
    }

    commit();
    closeEditing();
    // 서버에 저장한 수정은 인터뷰한 입력으로 쳐요. 뒤로 가도 채팅을 다시 하지 않아요.
    if (response) interviewedKey.current = currentKey(changed);
    if (localOnly) setNeedsRecreate(true);
    if (response) {
      try {
        checkSafety(response, changed);
      } catch (error) {
        setNotice(error.message || '잠시 문제가 생겼어요. 다시 시도해 주세요.');
      }
    }
    return '';
  };

  const handleSaveChild = (changes) => {
    const nextChild = { ...child, ...changes };
    return saveEdit(
      (id) => saveChildInfo(id, {
        ...(savedChildId ? { childId: savedChildId } : {}),
        profile: toChildProfile(nextChild, interests),
        saveForNextTime: saveChild,
      }),
      () => setChild(nextChild),
      { child: nextChild },
    );
  };

  const handleSaveSituation = (event) => {
    const nextDetail = { ...detail, event };
    return saveEdit(
      (id) => saveSituation(id, toSituationRequest(situation, nextDetail)),
      () => setDetail(nextDetail),
      { detail: nextDetail },
    );
  };

  const handleSaveGoal = (goal) =>
    saveEdit((id) => saveSummary(id, goal), () => setChatGoal(goal));

  // 서버는 입력할 때마다 만들던 동화를 저장해 두므로, '저장할게요'는 그대로 나가면 돼요.
  const handleDiscard = async () => {
    const id = session.current.id;
    if (id) await deleteStory(id).catch(() => {});
    navigate('/home');
  };

  const summaryGoal = chatGoal || (topic.undecided ? '' : topic.message.trim()) || SUMMARY_FALLBACK_GOAL;

  const activeJob = job && job.storyId === storyId ? job : null;
  // 동화 만드는 중 화면에 있다가 제작이 끝나면 제작 완료 화면으로 넘어가요.
  const visibleStep = step === STEP.GENERATING && activeJob?.status === 'done' ? STEP.COMPLETE : step;
  const completedNotificationId = visibleStep === STEP.COMPLETE ? activeJob.notificationId : null;

  // 글·그림을 만들다 실패하면 실패 화면 없이 서재로 보내요. 실패 알림이 남고, 서재의 '만들지 못했어요' 카드에서 다시 만들 수 있어요.
  const generationFailed = activeJob?.status === 'failed';
  useEffect(() => {
    if (generationFailed) navigate('/library', { replace: true });
  }, [generationFailed, navigate]);

  // 완료 화면을 직접 봤다면 같은 내용의 알림은 읽은 것으로 해요.
  useEffect(() => {
    if (completedNotificationId) markRead(completedNotificationId);
  }, [completedNotificationId, markRead]);

  const toneOpen = Boolean(toneResolver);

  // 만드는 중·제작 완료 화면은 진행 바와 아래 버튼 없이 로고만 있는 헤더를 써요.
  const progress = visibleStep >= STEP.GENERATING ? null : (toneOpen ? toneProgress(step) : progressByStep[step]);
  const showFooter = step !== STEP.CHAT && step < STEP.GENERATING;

  // 위기 신호가 있어 동화를 만들 수 없을 때는 안내 화면만 보여줘요.
  if (blocked || activeJob?.status === 'blocked') {
    return <BlockedStep onHome={handleDiscard} />;
  }

  // 입력 내용·AI 인터뷰가 이전 동화와 거의 같아 만들지 못했을 때의 안내 화면이에요. (같은 내용으로 다시 만들기 / 입력내용 고치기)
  if (similarStory) {
    return (
      <div className={styles.page}>
        <StoryHeader progress={null} onExit={() => navigate('/home')} />
        <main className={styles.main}>
          <GenerationFailedStep
            onRetry={() => {
              setSimilarStory(false);
              handleStartGeneration();
            }}
            onEdit={handleEditInputs}
            busy={busy}
            hasInterview={hadInterview}
          />
        </main>
      </div>
    );
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
            recap={detail.event.trim()}
            initialMessages={chatLog?.messages}
            initialChoices={chatLog?.choices ?? interviewChoices}
            readOnly={interviewDone}
            onLog={setChatLog}
            onContinue={() => goTo(STEP.SUMMARY)}
            onFinish={handleChatFinish}
            onSafety={handleChatBlocked}
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
        {!toneOpen && visibleStep === STEP.GENERATING && (
          <GeneratingStep stage={activeJob?.stage ?? 0} />
        )}
        {!toneOpen && visibleStep === STEP.COMPLETE && <CompleteStep title={activeJob.title} coverUrl={activeJob.coverUrl} />}
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
          maxLength={GOAL_MAX_LENGTH}
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
