// AI 질문과 함께 서버가 답변 후보(카드)를 주면 화면에 보여줘요. (Figma 628:1370의 답변 카드)
// API 명세에는 아직 답변 후보 필드가 없어서, 서버가 추가할 때 쓸 만한 이름을 모두 받아 줘요.
// 문자열 목록이거나 { label | text | title } 목록이면 돼요. 없으면 빈 목록이라 카드가 안 보여요.
const MAX_CHOICES = 4;

export function extractChoices(response) {
  const raw = response?.choices ?? response?.suggestions ?? response?.options ?? response?.quickReplies;
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => (typeof item === 'string' ? item : (item?.label ?? item?.text ?? item?.title)))
    .filter(Boolean)
    .slice(0, MAX_CHOICES);
}
