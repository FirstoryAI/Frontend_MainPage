// 서버가 질문의 목적(purpose)을 내부 코드로 줄 때 보여줄 설명이에요. 코드가 아니라 문장이면 그대로 써요.
const PURPOSE_TEXT = {
  empathy: '주인공의 마음에 공감해 보는 쪽이에요.',
  predict: '다음 이야기가 어떻게 될지 상상해 보는 쪽이에요.',
  perspective: '다른 친구의 입장에서 생각해 보는 쪽이에요.',
  connect: '우리 아이의 경험과 이어서 이야기해 보는 쪽이에요.',
};
const DEFAULT_PURPOSE_TEXT = '이 쪽에서 아이와 이야기를 나눠 볼 수 있어요.';

function purposeText(purpose) {
  if (!purpose) return DEFAULT_PURPOSE_TEXT;
  if (PURPOSE_TEXT[purpose]) return PURPOSE_TEXT[purpose];
  return /[가-힣]/.test(purpose) ? purpose : DEFAULT_PURPOSE_TEXT;
}

// 이 쪽에 대한 설명과 대화 가이드를 골라요.
// 쪽 사이 질문(afterPage)이 있으면 그 질문을, 없으면 읽기 전(첫 쪽)·읽은 뒤(마지막 쪽) 안내를 보여줘요.
export function guideFor(guide, pageNo, pageCount) {
  const prompt = guide.prompts?.find((item) => item.afterPage === pageNo);
  if (prompt) {
    return {
      description: purposeText(prompt.purpose),
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
