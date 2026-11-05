import { lockedCategories } from '../story/constants';
import scenarioFriend from '../../assets/images/home/scenario-friend.png';
import scenarioEmotion from '../../assets/images/home/scenario-emotion.png';
import scenarioKindergarten from '../../assets/images/home/scenario-kindergarten.png';
import scenarioHabit from '../../assets/images/home/scenario-habit.png';
import scenarioTantrum from '../../assets/images/home/scenario-tantrum.png';
import scenarioFriendLeftOut from '../../assets/images/home/scenario-friend-left-out.png';
import scenarioFamilyApart from '../../assets/images/home/scenario-family-apart.png';
import scenarioKindergartenScared from '../../assets/images/home/scenario-kindergarten-scared.png';
import scenarioGrandmaSick from '../../assets/images/home/scenario-grandma-sick.png';
import scenarioClothesTeeth from '../../assets/images/home/scenario-clothes-teeth.png';

// 동화 만들기에서 잠가 둔 카테고리(이별 · 죽음)의 카드는 당분간 홈과 '부모들의 이야기' 목록(전체)에서 보여주지 않아요.
// 카드 데이터와 팝업 문구는 그대로 두었으니, lockedCategories에서 빼면 다시 나타나요.
const isAvailable = (scenario) => !lockedCategories.includes(scenario.category);

// 홈의 추천 카드로 보여주는 시나리오예요. '부모들의 이야기'(더보기) 목록에도 모두 들어가요.
const homeScenarios = [
  { id: 'friend', category: '친구 관계', accessibleTitle: '친구가 장난감을 빼앗았어요', title: <>친구가 장난감을<br />빼앗았어요</>, description: '아이에게 어떻게 말해줘야 할까요?', image: scenarioFriend, color: 'friend', accentColor: '#ff7c68' },
  { id: 'emotion', category: '가족', accessibleTitle: '동생이 태어났어요', title: '동생이 태어났어요', description: '아이의 마음을 어떻게 물어볼까요?', image: scenarioEmotion, color: 'emotion', accentColor: '#65d0a5' },
  { id: 'kindergarten', category: '등원 · 적응', accessibleTitle: '유치원에 가기 싫어요', title: '유치원에 가기 싫어요', description: '어떤 말로 안심시켜 줄까요?', image: scenarioKindergarten, color: 'kindergarten', accentColor: '#ffcf55' },
  { id: 'habit', category: '이별 · 죽음', accessibleTitle: '반려견과 이별했어요', title: '반려견과 이별했어요', description: '어떤 말로 위로해 줄까요?', image: scenarioHabit, color: 'habit', accentColor: '#9e95ff' },
  { id: 'tantrum', category: '떼쓰기 · 훈육', accessibleTitle: '갑자기 짜증이 폭발했어요', title: <>갑자기 짜증이<br />폭발했어요</>, description: '아이에게 어떻게 말해줘야 할까요?', image: scenarioTantrum, color: 'tantrum', accentColor: '#4ab1ff' },
];
export const scenarios = homeScenarios.filter(isAvailable);

// '부모들의 이야기'(더보기) 목록에만 더 나오는 시나리오예요. color는 카드 배경색(홈 카드와 같은 다섯 가지)이고,
// id는 카드마다 다른 그림 위치를 맞출 때 써요.
const moreScenarios = [
  { id: 'friendLeftOut', category: '친구 관계', accessibleTitle: '친구들이 나만 빼고 놀아요', title: <>친구들이 나만 빼고<br />놀아요</>, description: '아이에게 어떻게 말해줘야 할까요?', image: scenarioFriendLeftOut, color: 'friend', accentColor: '#ff7c68' },
  { id: 'familyApart', category: '가족', accessibleTitle: '엄마 아빠가 따로 지내게 됐어요', title: <>엄마 아빠가 따로<br />지내게 됐어요</>, description: '아이의 마음을 어떻게 물어볼까요?', image: scenarioFamilyApart, color: 'emotion', accentColor: '#65d0a5' },
  { id: 'kindergartenScared', category: '등원 · 적응', accessibleTitle: '엄마가 오지 않을 것 같아서 무서워요', title: <>엄마가 오지 않을 것<br />같아서 무서워요</>, description: '어떤 말로 안심시켜 줄까요?', image: scenarioKindergartenScared, color: 'kindergarten', accentColor: '#ffcf55' },
  { id: 'grandmaPassed', category: '이별 · 죽음', accessibleTitle: '할머니가 돌아가셨어요', title: '할머니가 돌아가셨어요', description: '어떤 말로 안심시켜 줄까요?', image: scenarioGrandmaSick, color: 'habit', accentColor: '#9e95ff' },
  { id: 'clothesTeeth', category: '떼쓰기 · 훈육', accessibleTitle: '옷 입기 싫어요 양치하기 싫어요', title: <>옷 입기 싫어요<br />양치하기 싫어요</>, description: '아이에게 어떻게 말해줘야 할까요?', image: scenarioClothesTeeth, color: 'tantrum', accentColor: '#4ab1ff' },
];

// 더보기 목록의 카드 순서예요. (디자인대로 한 줄에 4개씩 놓여요.)
const LIST_ORDER = [
  'friend', 'emotion', 'kindergarten', 'tantrum',
  'habit', 'clothesTeeth', 'friendLeftOut', 'grandmaPassed',
  'familyApart', 'kindergartenScared',
];
const allScenarios = [...homeScenarios, ...moreScenarios];
export const listScenarios = LIST_ORDER
  .map((id) => allScenarios.find((scenario) => scenario.id === id))
  .filter(isAvailable);
