import { useEffect, useRef, useState } from 'react';
import { CHAT_INTRO } from '../categoryContent';
import { answerInterview } from '../../../services/storiesApi';
import avatar from '../../../assets/images/chat-avatar.png';
import sendCircle from '../../../assets/icons/send-circle.svg';
import sendArrow from '../../../assets/icons/send-arrow.svg';
import styles from './ChatStep.module.css';

// 서버가 '넘어가기'를 계속 받아 줄 때 무한히 돌지 않도록 두는 한도예요.
const MAX_SKIPS = 8;
const ERROR_TEXT = '잠시 문제가 생겼어요. 다시 보내 주세요.';

// 만들던 인터뷰(turns: [{ question, answer }])를 대화 말풍선으로 바꿔요. 마지막 질문은 아직 답이 없어요.
function turnsToMessages(turns) {
  const messages = [{ id: 'ai-intro', from: 'ai', text: CHAT_INTRO }];
  turns.forEach((turn, index) => {
    if (turn.question) messages.push({ id: `ai-${index}`, from: 'ai', text: turn.question });
    if (turn.answer) messages.push({ id: `user-${index}`, from: 'user', text: turn.answer });
  });
  return messages;
}

// FIRSTORY AI의 인터뷰예요. 질문에 답하면 서버가 다음 질문을 주고, 충분해지면 요약(summary)을 줘요.
// onFinish(summary): 인터뷰가 끝났을 때, onSafety(safety): 차단(BLOCK)일 때
function ChatStep({ storyId, turns, onFinish, onSafety }) {
  const [messages, setMessages] = useState(() => turnsToMessages(turns));
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);
  const counter = useRef(0);
  const mounted = useRef(true);

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
    setBusy(true);
    try {
      handleResponse(await answerInterview(storyId, trimmed));
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
        if (handleResponse(await answerInterview(storyId, null))) return;
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

      <div className={styles.composer}>
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
    </div>
  );
}

export default ChatStep;
