// 그림 위에 뜨는 의성어·의태어 색이에요. 그림책처럼 선명한 색을 말마다 하나씩 골라요.
// 같은 말은 언제나 같은 색이 되도록, 글자로 색을 정해요.
const TONES = ['#7a4bd0', '#ff6a2b', '#14a394', '#ec4a86', '#2d7be0'];

export function soundWordTone(text) {
  const sum = Array.from(String(text ?? '')).reduce((total, char) => total + char.codePointAt(0), 0);
  return TONES[sum % TONES.length];
}
