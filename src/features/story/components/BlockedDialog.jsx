import StoryNoticeDialog from './StoryNoticeDialog';
import styles from './StoryDraftModal.module.css';

const HELP_TEXT = {
  CHILD_SAFETY: '아이의 안전이 걱정되시면 가까운 전문 기관이나 상담 서비스에 먼저 연락해 주세요.',
  PARENTING: '혼자 힘들다면 육아·양육 상담 서비스에서 도움을 받아 보세요.',
};

// 동화로 만들기 어려운 내용이면 만들기를 멈추고 도움받을 곳을 알려줘요. (ST-05)
function BlockedDialog({ safety, onClose }) {
  const help = HELP_TEXT[safety?.helpKind] ?? '지금은 이 이야기로 동화를 만들 수 없어요.';

  return (
    <StoryNoticeDialog
      title="이 이야기는 동화로 만들 수 없어요"
      description={[safety?.reason, help].filter(Boolean).join(' ')}
      labelId="blocked-dialog-title"
    >
      <div className={styles.actions}>
        <button className={styles.primary} type="button" onClick={onClose}>
          홈으로
        </button>
      </div>
    </StoryNoticeDialog>
  );
}

export default BlockedDialog;
