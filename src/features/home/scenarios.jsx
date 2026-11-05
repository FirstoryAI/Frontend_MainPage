import scenarioFriend from '../../assets/images/home/scenario-friend.png';
import scenarioEmotion from '../../assets/images/home/scenario-emotion.png';
import scenarioKindergarten from '../../assets/images/home/scenario-kindergarten.png';
import scenarioHabit from '../../assets/images/home/scenario-habit.png';
import scenarioTantrum from '../../assets/images/home/scenario-tantrum.png';

// 홈의 추천 카드와 '부모들의 이야기' 목록이 함께 쓰는 시나리오 목록이에요.
export const scenarios = [
  { id: 'friend', category: '친구 관계', accessibleTitle: '친구가 장난감을 빼앗았어요', title: <>친구가 장난감을<br />빼앗았어요</>, description: '아이에게 어떻게 말해줘야 할까요?', image: scenarioFriend, color: 'friend', accentColor: '#ff7c68' },
  { id: 'emotion', category: '가족', accessibleTitle: '동생이 태어났어요', title: '동생이 태어났어요', description: '아이의 마음을 어떻게 물어볼까요?', image: scenarioEmotion, color: 'emotion', accentColor: '#65d0a5' },
  { id: 'kindergarten', category: '등원 · 적응', accessibleTitle: '유치원에 가기 싫어요', title: '유치원에 가기 싫어요', description: '어떤 말로 안심시켜 줄까요?', image: scenarioKindergarten, color: 'kindergarten', accentColor: '#ffcf55' },
  { id: 'habit', category: '이별 · 죽음', accessibleTitle: '반려견과 이별했어요', title: '반려견과 이별했어요', description: '어떤 말로 위로해 줄까요?', image: scenarioHabit, color: 'habit', accentColor: '#9e95ff' },
  { id: 'tantrum', category: '떼쓰기 · 훈육', accessibleTitle: '갑자기 짜증이 폭발했어요', title: <>갑자기 짜증이<br />폭발했어요</>, description: '아이에게 어떻게 말해줘야 할까요?', image: scenarioTantrum, color: 'tantrum', accentColor: '#4ab1ff' },
];
