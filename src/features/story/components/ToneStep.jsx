import MascotBubble from './MascotBubble';
import styles from './SituationStep.module.css';

const tones = [
  { id: 'PLAIN', title: '담담하게, 있는 그대로', description: ['무슨 일이 있었는지 차분하게 보여줘요'] },
  { id: 'WARM', title: '따뜻하게, 위로하며', description: ['슬픈 마음을 함께 느끼는 장면을 넣어요'] },
  { id: 'UNDECIDED', title: '아직 잘 모르겠어요', description: ['부드럽게 만들고,', '미리보기에서 다시 정할 수 있어요'] },
];

// 디자인(628:1624)은 이별 이야기 문구예요. 다른 분류는 같은 뜻의 일반 문구로 보여줘요.
function introTitle(category) {
  return category === '이별 · 죽음'
    ? '이별을 다루는 이야기에요. 어떤 분위기로 만들까요?'
    : '조심스러운 이야기에요. 어떤 분위기로 만들까요?';
}

// 민감한 주제가 감지되면 동화의 분위기를 고르는 단계예요. (ST-04) 상황 선택 화면과 같은 틀을 써요.
function ToneStep({ category, selected, onSelect }) {
  return (
    <div className={styles.step}>
      <MascotBubble
        className={styles.intro}
        title={introTitle(category)}
        description="아이에게 보여주기 전에 부모님이 먼저 읽고 정할 수 있어요."
      />

      <div className={styles.cards} role="radiogroup" aria-label="이야기 분위기">
        {tones.map((tone) => {
          const isSelected = selected === tone.id;
          const isMultiline = tone.description.length > 1;

          return (
            <label
              className={[
                styles.card,
                isMultiline ? styles.multiline : styles.singleline,
                isSelected && styles.selected,
              ]
                .filter(Boolean)
                .join(' ')}
              key={tone.id}
            >
              <input
                className={styles.input}
                type="radio"
                name="tone"
                value={tone.id}
                checked={isSelected}
                onChange={() => onSelect(tone.id)}
              />
              <span className={styles.title}>{tone.title}</span>
              <span className={styles.description}>
                {tone.description.map((line, index) => (
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

export default ToneStep;
