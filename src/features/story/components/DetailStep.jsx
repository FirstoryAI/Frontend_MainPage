import MascotBubble from './MascotBubble';
import Chip from './Chip';
import { categories } from '../constants';
import { getCategoryContent } from '../categoryContent';
import detailMascot from '../../../assets/images/story-detail-mascot.png';
import form from './FormControls.module.css';
import styles from './DetailStep.module.css';

function DetailStep({ detail, onChange }) {
  // 고른 카테고리에 따라 예시 문장이 바뀌어요. 고르기 전에는 기본 예시를 보여줘요.
  const content = getCategoryContent(detail.category);

  return (
    <div className={styles.step}>
      <MascotBubble
        mascotImage={detailMascot}
        className={styles.intro}
        title="어떤 일이 있었는지 알려 주세요."
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
          무슨 일이 있었나요?
        </label>
        <textarea
          className={`${form.control} ${form.textarea} ${styles.textarea}`}
          id="story-event"
          name="event"
          placeholder={content.eventExample}
          value={detail.event}
          onChange={(event) => onChange({ event: event.target.value })}
        />
      </div>

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
    </div>
  );
}

export default DetailStep;
