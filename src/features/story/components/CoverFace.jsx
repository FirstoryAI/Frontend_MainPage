import styles from './StoryReader.module.css';

// 앞표지·뒤표지 한 면의 모양이에요. 서재 표지와 같은 정사각형에 책 두께·책등 주름·빛·그림자를 그려요.
// (책장 안의 표지와, 펼치고 덮을 때 움직이는 표지가 함께 써요)
// portrait(한 쪽씩 보는 화면)에서는 책등 없이 화면 가운데에 놓아요.
// openable: 누르면 책이 열리는 앞표지예요. (StoryReader가 누른 자리를 알아봐요)
export default function CoverFace({ src, label, side, portrait = false, loading, fetchPriority, openable = false }) {
  return (
    <div className={styles.coverFrame} data-side={side} data-portrait={portrait || undefined}>
      <div className={styles.coverBook} data-openable={openable || undefined}>
        <img className={styles.coverImage} src={src} alt={label} loading={loading} fetchPriority={fetchPriority} decoding="async" draggable="false" />
        <span className={styles.coverSheen} aria-hidden="true" />
      </div>
    </div>
  );
}

