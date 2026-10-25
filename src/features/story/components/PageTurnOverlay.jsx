import styles from './PageTurnOverlay.module.css';

// 랜딩페이지 샘플 동화책의 책장 넘기는 효과예요. 그림을 반으로 나눠 가운데를 축으로 한쪽이 뒤집히고 다른 쪽은 사라져요.
// turn은 usePageTurn이 돌려준 값이에요. 그림을 보여주는 칸(position: relative, overflow: hidden) 안에 넣어요.
function PageTurnOverlay({ turn }) {
  if (!turn?.source) return null;

  const background = { backgroundImage: `url("${turn.source}")` };

  return (
    <div className={`${styles.spread} ${styles[turn.direction]}`} key={turn.key} aria-hidden="true">
      <div className={`${styles.half} ${styles.left}`} style={{ ...background, backgroundPosition: 'left center' }} />
      <div className={`${styles.half} ${styles.right}`} style={{ ...background, backgroundPosition: 'right center' }} />
    </div>
  );
}

export default PageTurnOverlay;
