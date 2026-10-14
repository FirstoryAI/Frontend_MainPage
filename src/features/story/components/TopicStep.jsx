import MascotBubble from './MascotBubble';
import radioOff from '../../../assets/icons/radio-off.svg';
import radioOnRing from '../../../assets/icons/radio-on-ring.svg';
import radioOnDot from '../../../assets/icons/radio-on-dot.svg';
import { getCategoryContent } from '../categoryContent';
import form from './FormControls.module.css';
import styles from './TopicStep.module.css';

function TopicStep({ category, topic, onChange }) {
  const content = getCategoryContent(category);

  return (
    <div className={styles.step}>
      <MascotBubble
        className={styles.intro}
        title="이번 이야기로 아이와 어떤 이야기를 나누고 싶나요?"
        description="정하지 않아도 괜찮아요. 다음 단계에서 FIRSTORY AI와 함께 정리해요."
      />

      <div className={styles.storyField}>
        <label className={form.label} htmlFor="story-message">
          전하고 싶은 이야기
        </label>
        <textarea
          className={`${form.control} ${form.textarea} ${styles.textarea} ${
            topic.undecided ? styles.dimmed : ''
          }`}
          id="story-message"
          name="message"
          placeholder={content.topicExample}
          value={topic.message}
          onChange={(event) =>
            onChange({ message: event.target.value, undecided: false })
          }
        />
      </div>

      <label className={`${styles.option} ${topic.undecided ? styles.checked : ''}`}>
        <input
          className={styles.input}
          type="checkbox"
          name="undecided"
          checked={topic.undecided}
          onChange={(event) => onChange({ undecided: event.target.checked })}
        />
        <span className={styles.radio} aria-hidden="true">
          <img src={topic.undecided ? radioOnRing : radioOff} alt="" />
          {topic.undecided && <img className={styles.dot} src={radioOnDot} alt="" />}
        </span>
        <span className={styles.optionTitle}>아직 잘 모르겠어요</span>
        <span className={styles.optionDescription}>
          AI가 질문하면서 나눌 수 있는 방향을 2~3개 함께 찾아요.
        </span>
      </label>
    </div>
  );
}

export default TopicStep;
