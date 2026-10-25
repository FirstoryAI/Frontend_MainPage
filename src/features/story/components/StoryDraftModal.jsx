import styles from './StoryDraftModal.module.css';
import iconClose from '../../../assets/icons/icon-close.svg';

// 만들던 동화를 마지막으로 고친 때를 '10월 25일 오후 8:12'처럼 보여줘요.
function formatDraftDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function StoryDraftModal({
  mode,
  drafts = [],
  onClose,
  onSave,
  onDiscard,
  onStartNew,
  onOpenDraftList,
  onOpenDraft,
  onBack,
}) {
  const isExit = mode === 'exit';
  const isList = mode === 'list';

  return (
    <div className={styles.overlay} onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        className={`${styles.dialog} ${isExit ? styles.exitDialog : ''} ${isList ? styles.listDialog : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="story-draft-title"
      >
        <button className={styles.close} type="button" onClick={onClose} aria-label="닫기"><img src={iconClose} alt="" /></button>

        {isExit ? (
          <>
            <h2 id="story-draft-title" className={styles.title}>제작 중이던 이야기를 저장하시겠어요?</h2>
            <div className={styles.actions}>
              <button className={styles.secondary} type="button" onClick={onDiscard}>아니요</button>
              <button className={styles.primary} type="button" onClick={onSave}>네, 저장할게요</button>
            </div>
          </>
        ) : isList ? (
          <>
            <button className={styles.back} type="button" onClick={onBack}>‹ <span>이전</span></button>
            <h2 id="story-draft-title" className={styles.title}>임시 저장한 동화</h2>
            <p className={styles.description}>이어서 만들 이야기를 선택해 주세요.</p>
            <div className={styles.draftList}>
              {drafts.map((draft) => (
                <button className={styles.draftItem} type="button" key={draft.id} onClick={() => onOpenDraft(draft)}>
                  <span className={styles.draftIcon} aria-hidden="true">📖</span>
                  <span className={styles.draftCopy}>
                    <strong>{draft.title}</strong>
                    <small>{draft.categoryLabel || '동화 만들기'} · {formatDraftDate(draft.updatedAt)}</small>
                  </span>
                  <span className={styles.chevron} aria-hidden="true">›</span>
                </button>
              ))}
              {drafts.length === 0 && (
                <p className={styles.empty}>저장한 동화가 아직 없어요. 새로운 동화를 만들어 보세요.</p>
              )}
            </div>
            <button className={styles.primary} type="button" onClick={onStartNew}>새로운 동화 만들기</button>
          </>
        ) : (
          <>
            <h2 id="story-draft-title" className={styles.title}>어떤 동화를 만들까요?</h2>
            <p className={styles.description}>새롭게 시작하거나, 저장해 둔 이야기를 이어 만들 수 있어요.</p>
            <div className={styles.choiceList}>
              <button className={styles.choice} type="button" onClick={onStartNew}>
                <span className={styles.choiceIcon} aria-hidden="true">＋</span>
                <span><strong>새로운 동화 만들기</strong><small>처음부터 새 이야기를 시작해요</small></span>
                <span className={styles.chevron} aria-hidden="true">›</span>
              </button>
              <button className={styles.choice} type="button" onClick={onOpenDraftList}>
                <span className={styles.choiceIcon} aria-hidden="true">▤</span>
                <span><strong>임시 저장한 동화</strong><small>{drafts.length}개의 이야기를 이어 만들 수 있어요</small></span>
                <span className={styles.chevron} aria-hidden="true">›</span>
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default StoryDraftModal;
