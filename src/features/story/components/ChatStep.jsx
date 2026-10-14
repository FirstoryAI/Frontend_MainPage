import { useEffect, useMemo, useRef, useState } from 'react';
import { buildInitialMessages, getCategoryContent } from '../categoryContent';
import avatar from '../../../assets/icons/chat-avatar.svg';
import sendCircle from '../../../assets/icons/send-circle.svg';
import sendArrow from '../../../assets/icons/send-arrow.svg';
import styles from './ChatStep.module.css';

// 준비된 AI 질문에 답하고 나서 마무리 화면으로 넘어가기 전에 잠깐 보여주는 시간(ms)
const FINISH_DELAY = 900;

function ChatStep({ category, onFinish }) {
  const content = useMemo(() => getCategoryContent(category), [category]);
  const [messages, setMessages] = useState(() => buildInitialMessages(category));
  const [draft, setDraft] = useState('');
  const [answered, setAnswered] = useState(false);
  const endRef = useRef(null);
  const goalRef = useRef(null);
  const timerRef = useRef(null);
  const sentCount = useRef(0);

  useEffect(() => {
    if (sentCount.current > 0) {
      endRef.current?.scrollIntoView({ block: 'end' });
    }
  }, [messages]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  // 준비된 질문은 하나라서, 답하면 채팅이 끝나요.
  const send = (text) => {
    const trimmed = text.trim();
    if (!trimmed || answered) {
      return;
    }
    sentCount.current += 1;
    setMessages((current) => [
      ...current,
      { id: `user-sent-${sentCount.current}`, from: 'user', text: trimmed },
    ]);
    setAnswered(true);

    const reply = content.chat.replies.find((item) => item.label === trimmed);
    goalRef.current = reply ? reply.goal : trimmed;
    timerRef.current = setTimeout(() => onFinish(goalRef.current), FINISH_DELAY);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    send(draft);
    setDraft('');
  };

  const handleSkip = () => {
    clearTimeout(timerRef.current);
    onFinish(goalRef.current);
  };

  return (
    <div className={styles.step}>
      <h1 className={styles.srOnly}>AI와 이야기 나누기</h1>

      <ol className={styles.messages} aria-live="polite">
        {messages.map((message) => (
          <li
            className={`${styles.row} ${message.from === 'user' ? styles.userRow : ''}`}
            key={message.id}
          >
            {message.from === 'ai' && (
              <img className={styles.avatar} src={avatar} alt="" />
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
      </ol>
      <div ref={endRef} />

      <div className={styles.composer}>
        <div className={styles.quickReplies}>
          {content.chat.replies.map((reply) => (
            <button
              className={styles.quickReply}
              type="button"
              key={reply.label}
              disabled={answered}
              onClick={() => send(reply.label)}
            >
              {reply.label}
            </button>
          ))}
        </div>

        <form className={styles.inputBar} onSubmit={handleSubmit}>
          <input
            className={styles.input}
            type="text"
            name="reply"
            aria-label="답변 입력"
            autoComplete="off"
            disabled={answered}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button
            className={styles.sendButton}
            type="submit"
            aria-label="보내기"
            disabled={answered || !draft.trim()}
          >
            <img src={sendCircle} alt="" />
            <img className={styles.arrow} src={sendArrow} alt="" />
          </button>
        </form>

        <button className={styles.skip} type="button" onClick={handleSkip}>
          여기까지 답하고 넘어가기
        </button>
      </div>
    </div>
  );
}

export default ChatStep;
