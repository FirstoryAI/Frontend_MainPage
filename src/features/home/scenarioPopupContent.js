const sharedPopupContent = {
  age: '5세',
  childTrait: '낯가림이 있는 아이',
  title: '친구가 같이 놀기 싫다고 했대요',
  description: [
    '아이가 집에 와서 친구가 자기랑 놀기 싫다고 했다며 속상해 했어요.',
    '평소 자기 마음을 잘 표현하지 못하는 아이라, 어떻게 이야기를 꺼내야 할지 고민이에요.',
  ],
  guideTitle: '이렇게 대화를 시작해 보세요',
  prompts: [
    {
      title: '아이의 감정부터 살펴보기',
      question: '“친구가 그렇게 말했을 때 마음이 어땠어?”',
    },
    {
      title: '아이가 원하는 것 물어보기',
      question: '“다음에 그 친구랑은 어떻게 놀고 싶어?”',
    },
  ],
  closingTitle: '이제 우리 아이와 이야기 나눠볼까요?',
  closingDescription: '아이의 속도에 맞춰, 작은 질문 하나부터 시작해 보세요.',
  actionLabel: '우리 아이와 대화 시작하기 →',
};

// API 연동 시 category id별 응답으로 교체할 수 있도록 분리해 둡니다.
export const scenarioPopupContent = {
  friend: sharedPopupContent,
  emotion: sharedPopupContent,
  kindergarten: sharedPopupContent,
  habit: sharedPopupContent,
};

