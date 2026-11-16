import { useEffect, useRef, useState } from 'react';
import checkedIcon from '../../../assets/story-preview-guide/feedback-check.svg';
import uncheckedIcon from '../../../assets/story-preview-guide/feedback-unchecked.svg';
import styles from './FeedbackDialog.module.css';

const previewQuestions = [
  { title: '입력한 우리 아이의 상황이 동화에 잘 반영되었나요?', options: ['잘 반영되었어요', '어느 정도 반영되었어요', '아쉬운 부분이 있어요'] },
  { title: '완성된 동화와 이야기에 만족하시나요?', options: ['만족해요', '보통이에요', '아쉬워요'] },
  { title: '완성된 동화를 아이와 함께 읽어보고 싶으신가요?', options: ['꼭 읽어보고 싶어요', '기회가 되면 읽어보고 싶어요', '아직 읽어볼 생각이 없어요'] },
];

const readingQuestions = [
  { title: '아이가 동화에 얼마나 흥미를 보였나요?', options: ['매우 흥미로워했어요', '보통이었어요', '흥미를 보이지 않았어요'] },
  { title: '동화를 읽으며 아이와 자연스럽게 대화를 나눌 수 있었나요?', options: ['자연스럽게 대화를 나눴어요', '평소와 비슷했어요', '대화로 이어지지 않았어요'] },
  { title: 'FIRSTORY가 아이와의 대화에 실질적으로 도움이 되었나요?', options: ['많은 도움이 되었어요', '조금 도움이 되었어요', '별로 도움이 되지 않았어요'] },
];

function FeedbackDialog({ sceneScale, onSubmit, variant = 'preview' }) {
  const isReading = variant === 'reading';
  const questions = isReading ? readingQuestions : previewQuestions;
  const dialogRef = useRef(null);
  const [answers, setAnswers] = useState(['', '', '']);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const previousFocus = document.activeElement;
    dialogRef.current?.focus();
    return () => previousFocus?.focus?.();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (answers.some((answer) => !answer)) {
      setError('모든 질문에 답변해 주세요.');
      return;
    }
    setSubmitting(true);
    setError('');
    const feedback = isReading
      ? { childInterest: answers[0], conversationFlow: answers[1], conversationHelpfulness: answers[2], comment: comment.trim() }
      : { situationReflection: answers[0], storySatisfaction: answers[1], readingIntent: answers[2], comment: comment.trim() };
    const message = await onSubmit(feedback);
    if (message) setError(message);
    setSubmitting(false);
  };

  return (
    <>
      <div className={styles.backdrop} />
      <div className={styles.scene} style={{ '--scene-scale': sceneScale }}>
        <form className={styles.dialog} ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="feedback-title" onSubmit={submit}>
          <p className={styles.eyebrow}>{isReading ? '아이와 함께 읽은 시간은 어땠나요?' : '우리 아이만의 이야기는 어땠나요?'}</p>
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
            <label className={styles.commentLabel} htmlFor="feedback-comment">{isReading ? '아이와 함께 FIRSTORY를 사용하며 느낀 점이나 개선되었으면 하는 점을 자유롭게 남겨주세요!' : 'FIRSTORY를 이용하면서 느낀 점이나 개선되었으면 하는 점이 있다면 자유롭게 남겨주세요!'}</label>
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
