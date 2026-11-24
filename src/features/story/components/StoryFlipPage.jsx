import { forwardRef, useContext } from 'react';
import SafeImage from './SafeImage';
import SoundWord from './SoundWord';
import StoryText from './StoryText';
import StoryTextBlocks from './StoryTextBlocks';
import { textPositionOf } from '../textPosition';
import { ActivePageContext } from '../activePageContext';
import styles from './StoryReader.module.css';

// copyClassName·fallbackClassName: 글 상자와 '그림 없음' 안내의 모양이에요. (없으면 읽기 화면 모양) storyPage.imageNote가 있으면 그 안내를 보여줘요.
const StoryFlipPage = forwardRef(function StoryFlipPage({ storyPage, pageNumber, side, portrait, copyClassName = styles.readerCopy, fallbackClassName = styles.flipFallback }, ref) {
  const activePage = useContext(ActivePageContext);
  const lines = (storyPage.text ?? '').split('\n').filter(Boolean);
  const nearCurrentPage = Math.abs(pageNumber - activePage) <= 1;

  return (
    <div className={styles.flipPage} ref={ref} aria-hidden={!portrait && side === 'right'} data-page-number={pageNumber}>
      <div className={`${styles.flipScene} ${!portrait && side === 'right' ? styles.flipSceneRight : ''}`}>
        <div className={styles.flipSceneImage}>
          <SafeImage
            src={storyPage.imageUrl}
            alt={`${pageNumber}쪽 동화 삽화`}
            loading={nearCurrentPage ? 'eager' : 'lazy'}
            fetchPriority={pageNumber === activePage || (activePage === 0 && pageNumber === 1) ? 'high' : 'low'}
            decoding="async"
            fallback={<p className={fallbackClassName} role="img" aria-label="그림 없음">{storyPage.imageNote ?? '그림을 아직 준비하지 못했어요.'}</p>}
          />
          {storyPage.imageUrl && <SoundWord word={storyPage.soundWord} />}
        </div>
        {storyPage.textBlocks == null ? (
          <div className={copyClassName} data-position={textPositionOf(storyPage)} data-story-text>
            {lines.map((line, index) => <p key={`${pageNumber}-${index}`}><StoryText text={line} /></p>)}
          </div>
        ) : <StoryTextBlocks blocks={storyPage.textBlocks} />}
      </div>
    </div>
  );
});

export default StoryFlipPage;
