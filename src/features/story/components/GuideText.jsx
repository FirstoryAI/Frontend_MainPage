import styles from './GuideText.module.css';

// 문장이 끝나는 곳(. ! ? … 뒤의 띄어쓰기)에 줄 표시를 넣고 나눠요.
// (예전 아이패드 Safari가 읽지 못하는 정규식 뒤보기 `(?<=…)`는 쓰지 않아요)
const SENTENCE_END = /([.!?…])\s+/g;
const splitSentences = (text) => String(text ?? '').replace(SENTENCE_END, '$1\n').split('\n').filter(Boolean);

// 대화 가이드의 줄글이에요. 읽기 쉽게 문장마다 줄을 바꾸고, 낱말 중간에서는 줄이 바뀌지 않게 해요.
// text: 서버가 준 가이드 문장(여러 문장이 한 줄로 와요)
function GuideText({ text }) {
  const sentences = splitSentences(text);
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
