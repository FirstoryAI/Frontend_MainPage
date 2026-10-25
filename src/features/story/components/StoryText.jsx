// 서버가 준 동화 글에는 **콩닥콩닥**처럼 강조 표시가 들어 있어요. 별표는 지우고 그 부분만 굵게 보여줘요.
function StoryText({ text }) {
  const parts = String(text ?? '').split(/\*\*(.+?)\*\*/g);

  return parts.map((part, index) => (index % 2 === 1 ? <strong key={index}>{part}</strong> : part));
}

export default StoryText;
