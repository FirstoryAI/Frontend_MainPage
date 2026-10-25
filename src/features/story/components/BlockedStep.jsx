import { useNavigate } from 'react-router-dom';
import CtaButton from '../../../components/ui/CtaButton';
import StoryHeader from './StoryHeader';
import { HELP_ORGANIZATIONS } from '../helpOrganizations';
import mascot from '../../../assets/images/story-blocked-mascot.webp';
import iconHomeWhite from '../../../assets/icons/icon-home-white.svg';
import styles from './BlockedStep.module.css';

// 입력한 내용에서 아이의 안전이 걱정되면(위기 신호) 동화를 만들지 않고 도움받을 곳을 알려줘요. (ST-05)
// onHome: 홈으로 나가요. 만들던 동화는 서버에서 지워요.
function BlockedStep({ onHome }) {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <StoryHeader progress={null} onExit={() => navigate('/home')} />

      <main className={styles.step}>
        <img className={styles.mascot} src={mascot} alt="" width="352" height="235" />
        <h1 className={styles.title}>이 내용은 동화로 만들지 않을게요</h1>
        <p className={styles.description}>
          입력하신 내용에서 아이의 안전이 걱정되는 부분이 보였어요.
          <br />
          지금은 전문가와 먼저 이야기해 보시길 권해요.
        </p>

        <ul className={styles.card} aria-label="도움받을 수 있는 곳">
          {HELP_ORGANIZATIONS.map((organization) => (
            <li className={styles.row} key={organization.name}>
              <span className={styles.name}>{organization.name}</span>
              {organization.href ? (
                <a className={styles.connect} href={organization.href}>
                  연결하기
                </a>
              ) : (
                <button className={styles.connect} type="button" disabled title="연결 방법이 정해지면 연결됩니다">
                  연결하기
                </button>
              )}
            </li>
          ))}
        </ul>

        <div className={styles.footer}>
          <CtaButton pill iconOnly icon={iconHomeWhite} aria-label="홈으로 가기" onClick={onHome} />
        </div>
      </main>
    </div>
  );
}

export default BlockedStep;
