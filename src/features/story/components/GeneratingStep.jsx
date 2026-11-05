import { useNavigate } from 'react-router-dom';
import CtaButton from '../../../components/ui/CtaButton';
import { useGenerationPosition } from '../generation/progressModel';
import LoadingMascots from './LoadingMascots';
import glyphBook from '../../../assets/icons/step-book.svg';
import glyphPencil from '../../../assets/icons/step-pencil.svg';
import glyphBrush from '../../../assets/icons/step-brush.svg';
import glyphCheck from '../../../assets/icons/step-check-done.svg';
import iconHomeWhite from '../../../assets/icons/icon-home-white.svg';
import styles from './GeneratingStep.module.css';

const stages = [
  { label: '이야기 짜기', title: '이야기를 짜고 있어요', glyph: glyphBook },
  { label: '글 쓰기', title: '글을 쓰고 있어요', glyph: glyphPencil },
  { label: '그림 그리기', title: '그림을 그리고 있어요', glyph: glyphBrush },
];

const clamp01 = (value) => Math.min(Math.max(value, 0), 1);

function stateOf(index, position) {
  if (position >= index + 1) return 'done';
  return position >= index ? 'active' : 'pending';
}

// job: 진행 중인 동화 제작이에요.
// 게이지 위치(0~3) 하나로 줄·고리·단계 아이콘·마스코트·제목이 함께 움직여서, 게이지가 닿는 순간 다음 단계로 넘어가요.
function GeneratingStep({ job }) {
  const navigate = useNavigate();
  const position = useGenerationPosition(job);
  const stage = Math.min(Math.floor(position), stages.length - 1);
  const scope = job?.scope;

  return (
    <div className={styles.step}>
      <ol className={styles.stepper} aria-label="동화 제작 단계">
        {[0, 1].map((index) => (
          <li className={styles.track} style={{ left: `${index * 50}%` }} key={index} aria-hidden="true">
            <span className={styles.fill} style={{ transform: `scaleX(${clamp01(position - index)})` }} />
          </li>
        ))}

        {stages.map((item, index) => (
          <li
            className={styles.node}
            style={{ left: `${index * 50}%`, '--p': `${clamp01(position - index) * 360}deg` }}
            data-state={stateOf(index, position)}
            aria-current={index === stage ? 'step' : undefined}
            key={item.label}
          >
            <span className={styles.badge}>
              <span className={styles.ring} aria-hidden="true" />
              <span className={styles.circle}>
                <img className={styles.glyph} src={item.glyph} alt="" />
                <img className={styles.check} src={glyphCheck} alt="" />
              </span>
            </span>
            <span className={styles.label}>{item.label}</span>
          </li>
        ))}
      </ol>

      <LoadingMascots stage={stage} />

      <h1 className={styles.titles} role="status">
        {stages.map((item, index) => (
          <span
            className={styles.title}
            data-active={index === stage}
            aria-hidden={index === stage ? undefined : 'true'}
            key={item.label}
          >
            {item.title}
          </span>
        ))}
      </h1>
      <p className={styles.notice}>
        {scope === 'IMAGES' ? '그림만 다시 만드는 데는 1분 안쪽으로 걸려요.' : '보통 3~4분 정도 걸려요.'} 화면을 나가도 동화는 계속 만들어져요.
      </p>
      <p className={styles.kakao}>제작이 완료되면 카카오톡으로 알려드려요</p>

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

export default GeneratingStep;
