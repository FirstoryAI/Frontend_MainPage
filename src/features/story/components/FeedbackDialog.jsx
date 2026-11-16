import { useEffect, useRef, useState } from 'react';
import checkedIcon from '../../../assets/story-preview-guide/feedback-check.svg';
import uncheckedIcon from '../../../assets/story-preview-guide/feedback-unchecked.svg';
import styles from './FeedbackDialog.module.css';

const questions = [
  { title: '입력한 우리 아이의 상황이 동화에 잘 반영되었나요?', options: ['잘 반영되었어요', '어느 정도 반영되었어요', '아쉬운 부분이 있어요'] },
  { title: '완성된 동화와 이야기에 만족하시나요?', options: ['만족해요', '보통이에요', '아쉬워요'] },
  { title: '완성된 동화를 아이와 함께 읽어보고 싶으신가요?', options: ['꼭 읽어보고 싶어요', '기회가 되면 읽어보고 싶어요', '아직 읽어볼 생각이 없어요'] },
];

function FeedbackDialog({ sceneScale, onClose, onSubmit }) {
  const dialogRef = useRef(null);
  const [answers, setAnswers] = useState(['', '', '']);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const previousFocus = document.activeElement;
    dialogRef.current?.focus();
    const handleKeyDown = (event) => { if (event.key === 'Escape' && !submitting) onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => { window.removeEventListener('keydown', handleKeyDown); previousFocus?.focus?.(); };
  }, [onClose, submitting]);

  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (answers.some((answer) => !answer)) {
      setError('모든 질문에 답변해 주세요.');
      return;
    }
    setSubmitting(true);
    setError('');
    const message = await onSubmit({ situationReflection: answers[0], storySatisfaction: answers[1], readingIntent: answers[2], comment: comment.trim() });
    if (message) setError(message);
    setSubmitting(false);
  };

  return (
    <>
      <div className={styles.backdrop} />
      <div className={styles.scene} style={{ '--scene-scale': sceneScale }}>
        <form className={styles.dialog} ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="feedback-title" onSubmit={submit}>
          <p className={styles.eyebrow}>우리 아이만의 이야기는 어땠나요?</p>
          <h2 id="feedback-title">더 나은 <span>FIRSTORY</span>를 위해 여러분의 솔직한 의견을 들려주세요</h2>
          <div className={styles.body}>
            {questions.map((question, index) => (
              <fieldset className={styles.question} key={question.title}>
                <legend>Q{index + 1}. {question.title} <span className={styles.required} aria-label="필수">*</span></legend>
                <div className={styles.options}>
                  {question.options.map((option) => (
                    <label key={option}>
                      <input type="radio" name={`feedback-${index}`} value={option} checked={answers[index] === option} onChange={() => setAnswers((current) => current.map((answer, i) => i === index ? option : answer))} required />
                      <img className={styles.radioIcon} src={answers[index] === option ? checkedIcon : uncheckedIcon} alt="" />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            <label className={styles.commentLabel} htmlFor="feedback-comment">FIRSTORY를 이용하면서 느낀 점이나 개선되었으면 하는 점이 있다면 자유롭게 남겨주세요!</label>
            <input id="feedback-comment" className={styles.comment} value={comment} onChange={(event) => setComment(event.target.value)} />
          </div>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <button className={styles.submit} type="submit" disabled={submitting}>{submitting ? '제출 중…' : '제출'}</button>
        </form>
      </div>
    </>
  );
}

export default FeedbackDialog;
