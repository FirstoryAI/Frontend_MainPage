// 이 쪽에 대한 설명과 대화 가이드를 골라요.
// 쪽 사이 질문(afterPage)이 있으면 그 질문을, 없으면 읽기 전(첫 쪽)·읽은 뒤(마지막 쪽) 안내를 보여줘요.
export function guideFor(guide, pageNo, pageCount) {
  const prompt = guide.prompts?.find((item) => item.afterPage === pageNo);
  if (prompt) {
    return {
      description: prompt.purpose,
      talk: [prompt.question, prompt.parentHint].filter(Boolean).join('\n'),
    };
  }
  if (pageNo === 1) {
    return {
      description: guide.beforeReading?.intent ?? '',
      talk: (guide.beforeReading?.tips ?? []).join('\n'),
    };
  }
  if (pageNo === pageCount) {
    return {
      description: '이야기를 다 읽은 뒤에 아이와 나눠 볼 수 있어요.',
      talk: [guide.afterReading?.bridgeQuestion, guide.afterReading?.ifUndecided].filter(Boolean).join('\n'),
    };
  }
  return { description: '이 쪽은 이야기를 그대로 읽어 주세요.', talk: '' };
}
