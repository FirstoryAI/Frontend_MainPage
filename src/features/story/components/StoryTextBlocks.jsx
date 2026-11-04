import StoryText from './StoryText';
import styles from './StoryTextBlocks.module.css';

// 그림에 맞춰 서버가 배치한 글 덩어리예요. paragraphs 안의 각 문자열은 한 줄로 표시해요.
function StoryTextBlocks({ blocks = [] }) {
  return (
    <div className={styles.blocks} aria-label="동화 본문">
      {blocks.map((block, blockIndex) => (
        <div
          className={styles.block}
          data-color={String(block.color ?? 'DARK').toUpperCase()}
          key={`${block.x}-${block.y}-${blockIndex}`}
          style={{ left: `${block.x ?? 0}%`, top: `${block.y ?? 0}%` }}
        >
          {(block.paragraphs ?? []).map((paragraph, paragraphIndex) => {
            const lines = Array.isArray(paragraph) ? paragraph : [paragraph];
            return (
              <p className={styles.paragraph} key={paragraphIndex}>
                {lines.map((line, lineIndex) => (
                  <span className={styles.line} key={lineIndex}>
                    <StoryText text={line} />
                  </span>
                ))}
              </p>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default StoryTextBlocks;
