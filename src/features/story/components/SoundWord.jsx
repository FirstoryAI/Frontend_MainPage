import { soundWordTone } from '../soundWordTone';
import styles from './SoundWord.module.css';

// 글자마다 조금씩 다르게 기울이고 오르내려서, 소리가 출렁이는 것처럼 보여요. (그림책 효과음 글씨)
const TILTS = [-9, 6, -4, 8];
const RISES = [0.05, -0.09, 0.07, -0.05];

// 쪽 글의 의성어·의태어(**훌쩍훌쩍**)를 그림 위, 그 소리를 내는 인물 옆에 크게 띄워요. 늘 떠 있는 장식이에요.
// word: 서버의 soundWord { text, x, y, color } — x·y는 말의 가운데(그림 폭·높이 대비 %)예요.
//  - 글씨는 히피체(--font-sound)이고, 테두리 없이 옅은 그림자만 둘러요.
//  - DARK(밝은 바탕): 선명한 색. 색은 말마다 정해져요. (본문의 같은 말은 다른 글과 똑같이 보여요)
//  - LIGHT(어두운 바탕): 노란 글씨
// 같은 말이 본문에도 있어서, 화면 읽기 프로그램에는 한 번만 읽히게 숨겨요.
function SoundWord({ word }) {
  if (!word?.text) return null;
  const chars = Array.from(word.text);
  return (
    <span
      className={styles.soundWord}
      data-color={String(word.color ?? 'DARK').toUpperCase()}
      style={{ left: `${word.x ?? 50}%`, top: `${word.y ?? 50}%`, '--tone': soundWordTone(word.text) }}
      aria-hidden="true"
    >
      {chars.map((char, index) => (
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
}

export default SoundWord;
