import { soundWordTone } from '../soundWordTone';
import styles from './SoundWord.module.css';

// 글자마다 조금씩 다르게 기울이고 오르내려서, 소리가 출렁이는 것처럼 보여요. (그림책 효과음 글씨)
const TILTS = [-9, 6, -4, 8];
const RISES = [0.05, -0.09, 0.07, -0.05];
// 조각 전체의 기울기예요. 인물 왼쪽 조각은 왼쪽으로, 오른쪽 조각은 오른쪽으로 기울여요.
const SIDE_ROTATE = { LEFT: -10, RIGHT: 10, CENTER: -6 };
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

// 서버 soundWord를 그림 위에 띄울 조각들로 바꿔요.
//  - 지금 모양: { text, color: '#RRGGBB', pieces: [{ text, x, y, side }] } — x·y는 조각 가운데(그림 폭·높이 대비 %)예요.
//    '데굴데굴'처럼 되풀이하는 말은 인물 양옆에 두 조각으로 와요.
//  - 예전 모양: { text, x, y, color: 'DARK' | 'LIGHT' } — 한 조각으로 봐요.
function piecesOf(word) {
  if (Array.isArray(word.pieces) && word.pieces.length) {
    return word.pieces.filter((piece) => piece?.text);
  }
  if (word.x == null || word.y == null) return [];
  return [{ text: word.text, x: word.x, y: word.y, side: 'CENTER' }];
}

function toneOf(word) {
  const color = String(word.color ?? '');
  if (HEX_COLOR.test(color)) return color;
  // 예전 모양: 어두운 바탕(LIGHT)은 노란 글씨, 밝은 바탕은 말마다 정한 선명한 색이에요.
  return color.toUpperCase() === 'LIGHT' ? '#ffd84a' : soundWordTone(word.text);
}

// 쪽 글의 의성어·의태어(**훌쩍훌쩍**)를 그림 위, 그 소리를 내는 인물 옆에 크게 띄워요. 늘 떠 있는 장식이에요.
// 글씨는 히피체(--font-sound)이고, 테두리 없이 옅은 그림자만 둘러요. 색은 서버가 그림 바탕에 맞춰 골라 줘요.
// 같은 말이 본문에도 있어서, 화면 읽기 프로그램에는 한 번만 읽히게 숨겨요.
function SoundWord({ word }) {
  if (!word?.text) return null;
  const pieces = piecesOf(word);
  if (!pieces.length) return null;
  const tone = toneOf(word);

  return pieces.map((piece, pieceIndex) => {
    const side = String(piece.side ?? 'CENTER').toUpperCase();
    return (
      <span
        className={styles.soundWord}
        style={{
          left: `${piece.x ?? 50}%`,
          top: `${piece.y ?? 50}%`,
          '--tone': tone,
          '--rotate': `${SIDE_ROTATE[side] ?? SIDE_ROTATE.CENTER}deg`,
        }}
        aria-hidden="true"
        key={`${pieceIndex}-${piece.text}`}
      >
        {Array.from(piece.text).map((char, index) => (
          <span
            className={styles.char}
            // 뒤로 갈수록 조금씩 커져서 소리가 커지는 느낌이에요. (최대 1.2배)
            style={{
              '--tilt': `${TILTS[index % TILTS.length]}deg`,
              '--rise': `${RISES[index % RISES.length]}em`,
              '--grow': 1 + Math.min(index, 5) * 0.04,
            }}
            key={`${index}-${char}`}
          >
            {char}
          </span>
        ))}
      </span>
    );
  });
}

export default SoundWord;
