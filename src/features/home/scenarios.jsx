import scenarioFriend from '../../assets/images/home/scenario-friend.png';
import scenarioEmotion from '../../assets/images/home/scenario-emotion.png';
import scenarioKindergarten from '../../assets/images/home/scenario-kindergarten.png';
import scenarioHabit from '../../assets/images/home/mascot-corner.png';

// 홈의 추천 카드와 '부모들의 이야기' 목록이 함께 쓰는 시나리오 목록이에요.
export const scenarios = [
  { id: 'friend', category: '친구 관계', accessibleTitle: '친구가 장난감을 빼앗았을 때', title: <>친구가 장난감을<br />빼앗았을 때</>, description: '아이에게 어떻게 말해줘야 할까요?', image: scenarioFriend, color: 'friend', accentColor: '#ff7c68' },
  { id: 'emotion', category: '감정 표현', accessibleTitle: '속상해도 아무 말 하지 않을 때', title: <>속상해도 아무 말<br />하지 않을 때</>, description: '아이의 마음을 어떻게 물어볼까요?', image: scenarioEmotion, color: 'emotion', accentColor: '#65d0a5' },
  { id: 'kindergarten', category: '새로운 환경', accessibleTitle: '유치원에 가기 싫다고 할 때', title: <>유치원에 가기<br />싫다고 할 때</>, description: '어떤 말로 안심시켜 줄까요?', image: scenarioKindergarten, color: 'kindergarten', accentColor: '#ffcf55' },
  { id: 'habit', category: '생활 습관', accessibleTitle: '실수하고 자꾸 숨기려고 할 때', title: <>실수하고 자꾸<br />숨기려고 할 때</>, description: '어떤 말로 안심시켜 줄까요?', image: scenarioHabit, color: 'habit', accentColor: '#9e95ff' },
];
