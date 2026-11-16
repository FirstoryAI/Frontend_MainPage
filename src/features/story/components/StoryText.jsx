// 서버가 준 동화 글에는 **콩닥콩닥**처럼 의성어·의태어 표시가 들어 있어요.
// 이 말은 그림 위에 크게 띄우니까(SoundWord), 본문에서는 별표만 지우고 다른 글과 똑같이(글꼴·크기·굵기) 보여줘요.
function StoryText({ text }) {
  return String(text ?? '').replace(/\*\*(.+?)\*\*/g, '$1');
}

export default StoryText;
