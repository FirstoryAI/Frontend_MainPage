import { forwardRef } from 'react';
import SafeImage from './SafeImage';
import StoryText from './StoryText';
import StoryTextBlocks from './StoryTextBlocks';
import { textPositionOf } from '../textPosition';
import styles from './StoryReader.module.css';

const StoryFlipPage = forwardRef(function StoryFlipPage({ storyPage, pageNumber, side, portrait }, ref) {
  const lines = (storyPage.text ?? '').split('\n').filter(Boolean);

  return (
    <div className={styles.flipPage} ref={ref} aria-hidden={!portrait && side === 'right'}>
      <div className={`${styles.flipScene} ${!portrait && side === 'right' ? styles.flipSceneRight : ''}`}>
        <SafeImage
          src={storyPage.imageUrl}
          alt={`${pageNumber}쪽 동화 삽화`}
          fallback={<p className={styles.flipFallback} role="img" aria-label="그림 없음">그림을 아직 준비하지 못했어요.</p>}
        />
        {storyPage.textBlocks == null ? (
          <div className={styles.readerCopy} data-position={textPositionOf(storyPage)}>
            {lines.map((line, index) => <p key={`${pageNumber}-${index}`}><StoryText text={line} /></p>)}
          </div>
        ) : <StoryTextBlocks blocks={storyPage.textBlocks} />}
      </div>
    </div>
  );
});

export default StoryFlipPage;
