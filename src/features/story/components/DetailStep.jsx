import MascotBubble from './MascotBubble';
import Chip from './Chip';
import { categories } from '../constants';
import { getCategoryContent } from '../categoryContent';
import detailMascot from '../../../assets/images/story-detail-mascot.png';
import form from './FormControls.module.css';
import styles from './DetailStep.module.css';

// 상황을 어떻게 골랐는지(past 있었던 일 / upcoming 앞으로 겪을 일 / proactive 먼저 알려 주고 싶은 일)에 따라 문구가 달라요.
// 아이의 반응은 이미 있었던 일에서만 받아요.
const TIMING_TEXT = {
  past: {
    title: '어떤 일이 있었는지 알려 주세요.',
    eventLabel: '무슨 일이 있었나요?',
  },
  upcoming: {
    title: '어떤 일을 앞두고 있는지 알려 주세요.',
    eventLabel: '무슨 일이 있을 예정인가요?',
    eventExample: '예: 다음 주부터 새 어린이집에 가요',
  },
  proactive: {
    title: '먼저 알려 주고 싶은 일을 적어 주세요.',
    eventLabel: '어떤 이야기를 먼저 해 주고 싶나요?',
    eventExample: '예: 곧 동생이 태어난다는 걸 미리 이야기해 주고 싶어요',
  },
};

function DetailStep({ situation, detail, onChange }) {
  const timing = TIMING_TEXT[situation] ?? TIMING_TEXT.past;
  const isPast = timing === TIMING_TEXT.past;
  // 고른 카테고리에 따라 예시 문장이 바뀌어요. 고르기 전에는 기본 예시를 보여줘요.
  const content = getCategoryContent(detail.category);

  return (
    <div className={styles.step}>
      <MascotBubble
        mascotImage={detailMascot}
        className={styles.intro}
        title={timing.title}
        description="짧게 적어도 괜찮아요. AI 인터뷰에서 더 여쭤볼게요."
      />

      <div className={`${styles.field} ${styles.categoryField}`}>
        <p className={form.label} id="category-label">
          어떤 일인가요?
        </p>
        <div className={styles.chips} role="radiogroup" aria-labelledby="category-label">
          {categories.map((category) => (
            <Chip
              key={category}
              name="category"
              value={category}
              checked={detail.category === category}
              onChange={() => onChange({ category })}
            >
              {category}
            </Chip>
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <label className={form.label} htmlFor="story-event">
          {timing.eventLabel}
        </label>
        <textarea
          className={`${form.control} ${form.textarea} ${styles.textarea}`}
          id="story-event"
          name="event"
          placeholder={timing.eventExample ?? content.eventExample}
          value={detail.event}
          onChange={(event) => onChange({ event: event.target.value })}
        />
      </div>

      {isPast && (
        <div className={styles.field}>
          <label className={form.label} htmlFor="story-reaction">
            아이는 어떻게 반응했나요?
          </label>
          <input
            className={`${form.control} ${form.textInput}`}
            id="story-reaction"
            name="reaction"
            type="text"
            placeholder={content.reactionExample}
            value={detail.reaction}
            onChange={(event) => onChange({ reaction: event.target.value })}
          />
        </div>
      )}
    </div>
  );
}

export default DetailStep;
