import styles from './SoundWord.module.css';

const SIDE_ROTATE = { LEFT: -10, RIGHT: 10, CENTER: 0 };
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

// 서버가 정한 조각의 중심 좌표와 색을 그대로 사용해요. 자리를 모르는 조각은 띄우지 않아요.
function SoundWord({ word }) {
  if (!Array.isArray(word?.pieces) || !word.pieces.length || !HEX_COLOR.test(word.color)) return null;

  const pieces = word.pieces.filter((piece) => (
    typeof piece?.text === 'string' && piece.text.length > 0
    && Number.isFinite(piece.x) && Number.isFinite(piece.y)
    && piece.x >= 0 && piece.x <= 100 && piece.y >= 0 && piece.y <= 100
  ));

  if (!pieces.length) return null;

  return pieces.map((piece, index) => {
    const side = String(piece.side ?? 'CENTER').toUpperCase();
    return (
      <span
        className={styles.soundWord}
        style={{
          left: `${piece.x}%`,
          top: `${piece.y}%`,
          color: word.color,
          '--rotate': `${SIDE_ROTATE[side] ?? SIDE_ROTATE.CENTER}deg`,
        }}
        aria-hidden="true"
        key={`${index}-${piece.text}`}
      >
        {piece.text}
      </span>
    );
  });
}

export default SoundWord;
