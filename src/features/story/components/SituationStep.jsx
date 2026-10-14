import MascotBubble from './MascotBubble';
import { situations } from '../constants';
import styles from './SituationStep.module.css';

function SituationStep({ selected, onSelect }) {
  return (
    <div className={styles.step}>
      <MascotBubble
        className={styles.intro}
        title="어떤 상황에 들려주는 이야기인지 선택해 주세요."
        description="선택한 상황에 맞춰 다음 질문이 달라져요."
      />

      <div className={styles.cards} role="radiogroup" aria-label="이야기 상황">
        {situations.map((situation) => {
          const isSelected = selected === situation.id;
          const isMultiline = situation.description.length > 1;

          return (
            <label
              className={[
                styles.card,
                isMultiline ? styles.multiline : styles.singleline,
                isSelected && styles.selected,
              ]
                .filter(Boolean)
                .join(' ')}
              key={situation.id}
            >
              <input
                className={styles.input}
                type="radio"
                name="situation"
                value={situation.id}
                checked={isSelected}
                onChange={() => onSelect(situation.id)}
              />
              <span className={styles.title}>{situation.title}</span>
              <span className={styles.description}>
                {situation.description.map((line, index) => (
                  <span key={line}>
                    {index > 0 && <br />}
                    {line}
                  </span>
                ))}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default SituationStep;
