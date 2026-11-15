import styles from './GuideText.module.css';

// 문장이 끝나는 곳(. ! ? … 뒤의 띄어쓰기)에서 나눠요.
const SENTENCE_END = /(?<=[.!?…])\s+/;

// 대화 가이드의 줄글이에요. 읽기 쉽게 문장마다 줄을 바꾸고, 낱말 중간에서는 줄이 바뀌지 않게 해요.
// text: 서버가 준 가이드 문장(여러 문장이 한 줄로 와요)
function GuideText({ text }) {
  const sentences = String(text ?? '').split(SENTENCE_END).filter(Boolean);
  return (
    <span className={styles.text}>
      {sentences.map((sentence, index) => (
        // 같은 문장이 두 번 나올 수 있어서 순서도 함께 key로 써요.
        <span className={styles.sentence} key={`${index}-${sentence}`}>{sentence}</span>
      ))}
    </span>
  );
}

export default GuideText;
