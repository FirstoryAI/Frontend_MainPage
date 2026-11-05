import { useNavigate } from 'react-router-dom';
import CtaButton from '../../../components/ui/CtaButton';
import { useGenerationFills } from '../generation/progressModel';
import thinkingImage from '../../../assets/images/story-loading-thinking.png';
import writingImage from '../../../assets/images/story-loading-writing.png';
import drawingImage from '../../../assets/images/story-loading-drawing.png';
import glyphBook from '../../../assets/icons/step-book.svg';
import glyphPencil from '../../../assets/icons/step-pencil.svg';
import glyphBrush from '../../../assets/icons/step-brush.svg';
import glyphCheck from '../../../assets/icons/step-check-done.svg';
import iconHomeWhite from '../../../assets/icons/icon-home-white.svg';
import styles from './GeneratingStep.module.css';

const stages = [
  { label: '이야기 짜기', title: '이야기를 짜고 있어요', glyph: glyphBook, image: thinkingImage, mascot: styles.thinking },
  { label: '글 쓰기', title: '글을 쓰고 있어요', glyph: glyphPencil, image: writingImage, mascot: styles.writing },
  { label: '그림 그리기', title: '그림을 그리고 있어요', glyph: glyphBrush, image: drawingImage, mascot: styles.drawing },
];

function stateOf(index, stage) {
  if (index < stage) return 'done';
  return index === stage ? 'active' : 'pending';
}

// job: 진행 중인 동화 제작이에요. 단계(stage)는 서버가 알려 주고, 게이지는 걸린 시간에 맞춰 실시간으로 차올라요.
// 단계가 바뀔 때는 마스코트·제목·단계 아이콘이 모두 CSS 전환으로 서서히 바뀌어요.
function GeneratingStep({ job }) {
  const navigate = useNavigate();
  const stage = job?.stage ?? 0;
  const scope = job?.scope;
  const fills = useGenerationFills(job);

  return (
    <div className={styles.step}>
      <ol className={styles.stepper} aria-label="동화 제작 단계">
        {[0, 1].map((index) => (
          <li className={styles.track} style={{ left: `${index * 50}%` }} key={index} aria-hidden="true">
            <span className={styles.fill} style={{ transform: `scaleX(${fills[index]})` }} />
          </li>
        ))}

        {stages.map((item, index) => (
          <li
            className={styles.node}
            style={{ left: `${index * 50}%`, '--p': `${Math.round(fills[index] * 360)}deg` }}
            data-state={stateOf(index, stage)}
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

      <div className={styles.mascots} aria-hidden="true">
        {stages.map((item, index) => (
          <div className={`${styles.mascot} ${item.mascot}`} data-active={index === stage} key={item.label}>
            <div className={styles.motion}>
              <img className={styles.mascotImage} src={item.image} alt="" />
              {index === 0 && <span className={styles.bulbGlow} />}
              {index === 2 && (
                <>
                  <span className={`${styles.sparkle} ${styles.sparkleBig}`} />
                  <span className={`${styles.sparkle} ${styles.sparkleSmall}`} />
                </>
              )}
            </div>
          </div>
        ))}
      </div>

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
