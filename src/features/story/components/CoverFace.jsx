import styles from './StoryReader.module.css';

// 앞표지·뒤표지 한 면의 모양이에요. 서재 표지와 같은 정사각형에 책 두께·책등 주름·빛·그림자를 그려요.
// (책장 안의 표지와, 펼치고 덮을 때 움직이는 표지가 함께 써요)
// portrait(한 쪽씩 보는 화면)에서는 책등 없이 화면 가운데에 놓아요.
// openable: 누르면 책이 열리는 앞표지예요. (StoryReader가 누른 자리를 알아봐요)
// peek: 마우스를 올리면 표지가 책등을 축으로 살짝 열려, 안쪽의 첫 쪽 오른쪽 그림이 비쳐 보여요. { src }는 첫 쪽 그림이에요.
//       (마우스가 없는 태블릿·휴대폰에서는 열리지 않고, 표지를 누르거나 '다음' 버튼을 눌러 열어요)
export default function CoverFace({ src, label, side, portrait = false, loading, fetchPriority, openable = false, peek = null }) {
  const face = (
    <>
      <img className={styles.coverImage} src={src} alt={label} loading={loading} fetchPriority={fetchPriority} decoding="async" draggable="false" />
      <span className={styles.coverSheen} aria-hidden="true" />
    </>
  );
  return (
    <div className={styles.coverFrame} data-side={side} data-portrait={portrait || undefined}>
      <div className={styles.coverBook} data-openable={openable || undefined} data-peek={peek ? '' : undefined}>
        {peek && (
          <span className={styles.coverPeek} aria-hidden="true">
            <img src={peek.src} alt="" loading="eager" decoding="async" draggable="false" />
          </span>
        )}
        {peek ? <span className={styles.coverSwing}>{face}</span> : face}
      </div>
    </div>
  );
}

