import { useNavigate } from 'react-router-dom';
import CtaButton from '../../../components/ui/CtaButton';
import mascot from '../../../assets/images/story-failed-mascot.webp';
import iconHomeWhite from '../../../assets/icons/icon-home-white.svg';
import styles from './GenerationFailedStep.module.css';

// 동화를 만들지 못했을 때 보여주는 화면이에요. 입력한 내용과 인터뷰 답은 그대로 남아 있어요.
// onRetry: 같은 내용으로 다시 만들어요. onEdit: 입력 내용을 고치러 가요.
// hasInterview: AI 인터뷰를 했으면 인터뷰 답도 남아 있다고 알려주고, 직접 적어서 인터뷰 없이 만든 동화는 입력 내용만 알려줘요.
function GenerationFailedStep({ onRetry, onEdit, busy = false, hasInterview = true }) {
  const navigate = useNavigate();

  return (
    <div className={styles.step}>
      <img className={styles.mascot} src={mascot} alt="" width="149" height="177" />
      <h1 className={styles.title} role="status">
        동화를 만들지 못했어요
      </h1>
      <p className={styles.description}>
        {hasInterview ? '입력하신 내용과 AI 인터뷰 답은 그대로 있어요.' : '입력하신 내용은 그대로 있어요.'}
        <br />
        같은 내용으로 다시 만들 수 있어요.
      </p>

      <div className={styles.actions}>
        <button className={styles.primary} type="button" onClick={onRetry} disabled={busy}>
          같은 내용으로 다시 만들기
        </button>
        <button className={styles.secondary} type="button" onClick={onEdit} disabled={busy}>
          입력내용 고치기
        </button>
      </div>

      <div className={styles.footer}>
        <CtaButton
          pill
          iconOnly
          icon={iconHomeWhite}
          aria-label="홈으로 가기"
          onClick={() => navigate('/home')}
        />
      </div>
    </div>
  );
}

export default GenerationFailedStep;
