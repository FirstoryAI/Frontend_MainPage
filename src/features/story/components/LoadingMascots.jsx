import thinkingBase from '../../../assets/loading/thinking-base.png';
import thinkingBubble from '../../../assets/loading/thinking-bubble.png';
import thinkingDot1 from '../../../assets/loading/thinking-dot1.png';
import thinkingDot2 from '../../../assets/loading/thinking-dot2.png';
import writingBase from '../../../assets/loading/writing-base.png';
import writingHand from '../../../assets/loading/writing-hand.png';
import drawingBase from '../../../assets/loading/drawing-base.png';
import drawingHand from '../../../assets/loading/drawing-hand.png';
import drawingPetals from '../../../assets/loading/drawing-petals.png';
import drawingCenter from '../../../assets/loading/drawing-center.png';
import drawingStem from '../../../assets/loading/drawing-stem.png';
import drawingLeafLeft from '../../../assets/loading/drawing-leaf-left.png';
import drawingLeafRight from '../../../assets/loading/drawing-leaf-right.png';
import drawingStars from '../../../assets/loading/drawing-stars.png';
import styles from './LoadingMascots.module.css';

// 이미지는 움직일 부분별로 나뉘어 있어요. 모든 레이어가 같은 크기라 겹치면 Figma 그림 한 장이 돼요.

// 이야기 짜기: 작은 동그라미가 차례로 떠오른 뒤 전구 말풍선이 생겼다가 사라져요.
function ThinkingMascot() {
  return (
    <>
      <img className={styles.image} src={thinkingBase} alt="" />
      <img className={`${styles.layer} ${styles.dot1}`} src={thinkingDot1} alt="" />
      <img className={`${styles.layer} ${styles.dot2}`} src={thinkingDot2} alt="" />
      <div className={`${styles.layer} ${styles.bubble}`}>
        <img className={styles.image} src={thinkingBubble} alt="" />
        <span className={styles.bulbGlow} />
      </div>
    </>
  );
}

// 글 쓰기: 연필 쥔 손이 공책 위를 지나가면, 그 자리에 글씨가 한 줄씩 써져요.
function WritingMascot() {
  return (
    <>
      <img className={styles.image} src={writingBase} alt="" />
      <svg className={styles.layer} viewBox="0 0 582 584" fill="none">
        <path
          className={`${styles.stroke} ${styles.strokeFirst}`}
          d="M306 484C311 480 318 477 330 475S345 474 348 475"
          pathLength="1"
        />
        <path
          className={`${styles.stroke} ${styles.strokeSecond}`}
          d="M305 509C310 505 313 501 318 500S328 500 332 499S343 495 348 494"
          pathLength="1"
        />
      </svg>
      <div className={`${styles.layer} ${styles.writingHand}`}>
        <img className={`${styles.image} ${styles.writingWiggle}`} src={writingHand} alt="" />
      </div>
    </>
  );
}

// 그림 그리기: 붓 쥔 손이 움직이는 동안 꽃잎 → 가운데 → 줄기 → 잎 순서로 그림이 그려져요.
function DrawingMascot() {
  return (
    <>
      <img className={styles.image} src={drawingBase} alt="" />
      <img className={`${styles.layer} ${styles.petals}`} src={drawingPetals} alt="" />
      <img className={`${styles.layer} ${styles.center}`} src={drawingCenter} alt="" />
      <img className={`${styles.layer} ${styles.stem}`} src={drawingStem} alt="" />
      <img className={`${styles.layer} ${styles.leafLeft}`} src={drawingLeafLeft} alt="" />
      <img className={`${styles.layer} ${styles.leafRight}`} src={drawingLeafRight} alt="" />
      <img className={`${styles.layer} ${styles.stars}`} src={drawingStars} alt="" />
      <img className={`${styles.layer} ${styles.drawingHand}`} src={drawingHand} alt="" />
    </>
  );
}

const mascots = [
  { Mascot: ThinkingMascot, position: styles.thinking },
  { Mascot: WritingMascot, position: styles.writing },
  { Mascot: DrawingMascot, position: styles.drawing },
];

// 세 마스코트가 같은 자리에 겹쳐 있다가, 단계가 바뀌면 서로 천천히 교차해요.
// 모션은 그 단계에 처음 들어갈 때 시작해서, 말풍선·글씨·그림이 항상 처음부터 보여요.
function LoadingMascots({ stage }) {
  return (
    <div className={styles.mascots} aria-hidden="true">
      {mascots.map(({ Mascot, position }, index) => (
        <div
          className={`${styles.mascot} ${position}`}
          data-active={index === stage}
          data-played={index <= stage}
          key={position}
        >
          <div className={styles.breathing}>
            <Mascot />
          </div>
        </div>
      ))}
    </div>
  );
}

export default LoadingMascots;
