import { useEffect, useRef, useState } from 'react';
import CtaButton from '../../../components/ui/CtaButton';
import { CHAT_INTRO } from '../categoryContent';
import { answerInterview } from '../../../services/storiesApi';
import { extractChoices } from '../interviewChoices';
import { INTERVIEW_QUESTION_LIMIT } from '../constants';
import avatar from '../../../assets/images/chat-avatar.png';
import sendCircle from '../../../assets/icons/send-circle.svg';
import sendArrow from '../../../assets/icons/send-arrow.svg';
import styles from './ChatStep.module.css';

// 서버가 '넘어가기'를 계속 받아 줄 때 무한히 돌지 않도록 두는 한도예요.
// 질문이 최대 15개라서 그보다 조금 넉넉하게 잡아요.
const MAX_SKIPS = INTERVIEW_QUESTION_LIMIT + 5;
const ERROR_TEXT = '잠시 문제가 생겼어요. 다시 보내 주세요.';

// 만들던 인터뷰(turns: [{ question, answer }])를 대화 말풍선으로 바꿔요. 마지막 질문은 아직 답이 없어요.
// recap은 부모가 앞에서 적은 상황이에요. 디자인처럼 AI 안내 다음에 부모의 첫 말로 보여줘요.
function turnsToMessages(turns, recap) {
  const messages = [{ id: 'ai-intro', from: 'ai', text: CHAT_INTRO }];
  if (recap) messages.push({ id: 'user-recap', from: 'user', text: recap });
  turns.forEach((turn, index) => {
    if (turn.question) messages.push({ id: `ai-${index}`, from: 'ai', text: turn.question });
    if (turn.answer) messages.push({ id: `user-${index}`, from: 'user', text: turn.answer });
  });
  return messages;
}

// FIRSTORY AI의 인터뷰예요. 질문에 답하면 서버가 다음 질문을 주고, 충분해지면 요약(summary)을 줘요.
// onFinish(summary): 인터뷰가 끝났을 때, onSafety(safety): 차단(BLOCK)일 때
// recap: 앞에서 적은 상황, initialChoices: 지금 질문의 답변 카드(없으면 빈 목록)
// initialMessages: 뒤로 갔다 돌아왔을 때 이어서 보여줄 이전 대화, onLog({ messages, choices }): 대화가 바뀔 때마다 알려줘요.
// readOnly: 이미 끝난 인터뷰라 대화를 보기만 해요. 아래 '다음'을 누르면 onContinue로 마무리 화면에 가요.
function ChatStep({
  storyId,
  turns,
  recap = '',
  initialMessages = null,
  initialChoices = [],
  readOnly = false,
  onLog,
  onContinue,
  onFinish,
  onSafety,
}) {
  const [messages, setMessages] = useState(() =>
    initialMessages?.length ? initialMessages : turnsToMessages(turns, recap),
  );
  const [choices, setChoices] = useState(initialChoices);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);
  // 이전 대화를 이어받으면 말풍선 id가 겹치지 않게 그 개수부터 세요.
  const counter = useRef(initialMessages?.length ?? 0);
  const mounted = useRef(true);

  useEffect(() => {
    onLog?.({ messages, choices });
  }, [messages, choices, onLog]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (counter.current > 0) {
      endRef.current?.scrollIntoView({ block: 'end' });
    }
  }, [messages]);

  const addMessage = (from, text) => {
    counter.current += 1;
    setMessages((current) => [...current, { id: `${from}-new-${counter.current}`, from, text }]);
  };

  // 서버 응답 하나를 처리해요. 끝났으면 true를 돌려줘요.
  const handleResponse = (response) => {
    setChoices(extractChoices(response));
    const action = response.safety?.action;
    if (action === 'BLOCK') {
      onSafety(response.safety);
      return true;
    }
    if (action === 'ASK_REVISE') {
      addMessage('ai', response.safety.reason || '표현을 조금 바꿔서 다시 알려 주세요.');
      if (response.question) addMessage('ai', response.question);
      return false;
    }
    if (response.type === 'CONFIRM') {
      onFinish(response.summary ?? '');
      return true;
    }
    if (response.question) addMessage('ai', response.question);
    return false;
  };

  const send = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    addMessage('user', trimmed);
    setDraft('');
    setChoices([]);
    setBusy(true);
    try {
      const response = await answerInterview(storyId, trimmed);
      handleResponse(response);
    } catch {
      if (!mounted.current) return;
      addMessage('ai', ERROR_TEXT);
      setDraft(trimmed);
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    send(draft);
  };

  // 남은 질문은 건너뛰고 서버가 정리한 요약으로 넘어가요.
  const handleSkip = async () => {
    if (busy) return;

    setBusy(true);
    try {
      for (let count = 0; count < MAX_SKIPS; count += 1) {
        const response = await answerInterview(storyId, null);
        if (handleResponse(response)) return;
      }
    } catch {
      if (mounted.current) addMessage('ai', ERROR_TEXT);
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  return (
    <div className={styles.step}>
      <h1 className={styles.srOnly}>AI와 이야기 나누기</h1>

      <ol className={styles.messages} aria-live="polite" aria-busy={busy}>
        {messages.map((message) => (
          <li
            className={`${styles.row} ${message.from === 'user' ? styles.userRow : ''}`}
            key={message.id}
          >
            {message.from === 'ai' && (
              <span className={styles.avatarFrame}>
                <img className={styles.avatar} src={avatar} alt="" />
              </span>
            )}
            <p
              className={`${styles.bubble} ${
                message.from === 'user' ? styles.userBubble : styles.aiBubble
              }`}
            >
              {message.text}
            </p>
          </li>
        ))}
        {busy && (
          <li className={styles.row}>
            <span className={styles.avatarFrame}>
              <img className={styles.avatar} src={avatar} alt="" />
            </span>
            <p className={`${styles.bubble} ${styles.aiBubble}`} role="status">
              생각하는 중이에요…
            </p>
          </li>
        )}
      </ol>
      <div ref={endRef} />

      {readOnly ? (
        <div className={`${styles.composer} ${styles.continue}`}>
          <CtaButton pill onClick={onContinue}>
            다음
          </CtaButton>
        </div>
      ) : (
      <div className={styles.composer}>
        {choices.length > 0 && (
          <div className={styles.quickReplies} role="group" aria-label="답변 후보">
            {choices.map((choice) => (
              <button
                className={styles.quickReply}
                type="button"
                key={choice}
                disabled={busy}
                onClick={() => send(choice)}
              >
                {choice}
              </button>
            ))}
          </div>
        )}

        <form className={styles.inputBar} onSubmit={handleSubmit}>
          <input
            className={styles.input}
            type="text"
            name="reply"
            aria-label="답변 입력"
            autoComplete="off"
            maxLength={500}
            disabled={busy}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button
            className={styles.sendButton}
            type="submit"
            aria-label="보내기"
            disabled={busy || !draft.trim()}
          >
            <img src={sendCircle} alt="" />
            <img className={styles.arrow} src={sendArrow} alt="" />
          </button>
        </form>

        <button className={styles.skip} type="button" disabled={busy} onClick={handleSkip}>
          여기까지 답하고 넘어가기
        </button>
      </div>
      )}
    </div>
  );
}

export default ChatStep;
