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
    <div className={styles.flipPage} ref={ref} aria-hidden={!portrait && side === 'right'}>
      <div className={`${styles.flipScene} ${!portrait && side === 'right' ? styles.flipSceneRight : ''}`}>
        <SafeImage
          src={storyPage.imageUrl}
          alt={`${pageNumber}쪽 동화 삽화`}
          loading={nearCurrentPage ? 'eager' : 'lazy'}
          fetchPriority={pageNumber === activePage || (activePage === 0 && pageNumber === 1) ? 'high' : 'low'}
          decoding="async"
          fallback={<p className={fallbackClassName} role="img" aria-label="그림 없음">{storyPage.imageNote ?? '그림을 아직 준비하지 못했어요.'}</p>}
        />
        {storyPage.textBlocks == null ? (
          <div className={copyClassName} data-position={textPositionOf(storyPage)}>
            {lines.map((line, index) => <p key={`${pageNumber}-${index}`}><StoryText text={line} /></p>)}
          </div>
        ) : <StoryTextBlocks blocks={storyPage.textBlocks} />}
        {/* 그림이 있을 때만 의성어·의태어를 그림 위에 띄워요. (옛 동화·별표 말이 없는 쪽은 soundWord가 null이에요) */}
        {storyPage.imageUrl && <SoundWord word={storyPage.soundWord} />}
      </div>
    </div>
  );
});

export default StoryFlipPage;
