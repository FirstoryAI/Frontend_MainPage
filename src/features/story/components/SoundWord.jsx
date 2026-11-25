import styles from './SoundWord.module.css';

const SIDE_ROTATE = { LEFT: -10, RIGHT: 10, CENTER: 0 };
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

// 서버가 정한 조각의 중심 좌표와 색을 그대로 사용해요. 자리를 모르는 조각은 띄우지 않아요.
function SoundWord({ word, editing = false, onMove }) {
  if (!Array.isArray(word?.pieces) || !word.pieces.length || !HEX_COLOR.test(word.color)) return null;

  const pieces = word.pieces.filter((piece) => (
    typeof piece?.text === 'string' && piece.text.length > 0
    && Number.isFinite(piece.x) && Number.isFinite(piece.y)
    && piece.x >= 0 && piece.x <= 100 && piece.y >= 0 && piece.y <= 100
  ));

  if (!pieces.length) return null;

  return pieces.map((piece, index) => {
    const side = String(piece.side ?? 'CENTER').toUpperCase();
    const move = (event) => {
      const bounds = event.currentTarget.parentElement.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      onMove?.(index, {
        x: Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100)),
        y: Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100)),
      });
    };
    return (
      <span
        className={`${styles.soundWord} ${editing ? styles.editing : ''}`}
        style={{
          left: `${piece.x}%`,
          top: `${piece.y}%`,
          color: word.color,
          '--rotate': `${SIDE_ROTATE[side] ?? SIDE_ROTATE.CENTER}deg`,
        }}
        aria-hidden="true"
        key={`${index}-${piece.text}`}
        onPointerDown={editing ? (event) => {
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.setPointerCapture(event.pointerId);
        } : undefined}
        onPointerMove={editing ? (event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) move(event);
        } : undefined}
        onPointerUp={editing ? (event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          event.stopPropagation();
        } : undefined}
        onClick={editing ? (event) => event.stopPropagation() : undefined}
      >
        {piece.text}
      </span>
    );
  });
}

export default SoundWord;
