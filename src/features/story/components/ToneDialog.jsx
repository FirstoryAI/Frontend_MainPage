import StoryNoticeDialog from './StoryNoticeDialog';
import styles from './StoryDraftModal.module.css';

const tones = [
  { value: 'PLAIN', title: '담담하게', description: '있었던 일을 차분하게 들려줘요' },
  { value: 'WARM', title: '따뜻하게', description: '마음을 다독이는 말투로 들려줘요' },
  { value: 'UNDECIDED', title: '잘 모르겠어요', description: 'FIRSTORY AI가 알맞게 정해요' },
];

// 민감한 주제가 감지되면 동화의 분위기를 먼저 골라야 해요. (ST-04)
function ToneDialog({ onSelect }) {
  return (
    <StoryNoticeDialog
      title="어떤 분위기로 들려줄까요?"
      description="조심스러운 이야기라서 분위기를 먼저 정해 두면 좋아요."
      labelId="tone-dialog-title"
    >
      <div className={styles.choiceList}>
        {tones.map((tone) => (
          <button className={styles.choice} type="button" key={tone.value} onClick={() => onSelect(tone.value)}>
            <span>
              <strong>{tone.title}</strong>
              <small>{tone.description}</small>
            </span>
          </button>
        ))}
      </div>
    </StoryNoticeDialog>
  );
}

export default ToneDialog;
