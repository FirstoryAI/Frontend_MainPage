// 미리보기와 대화 가이드 화면이 함께 쓰는 동화 쪽(삽화·글)이에요. 동화 생성 API가 연결되기 전까지 예시 내용이에요.
import page01 from '../../assets/story-preview/story-page-01.png';
import page02 from '../../assets/story-preview/story-page-02.png';
import page03 from '../../assets/story-preview/story-page-03.png';
import page04 from '../../assets/story-preview/story-page-04.png';
import page05 from '../../assets/story-preview/story-page-05.png';
import page06 from '../../assets/story-preview/story-page-06.png';

export const storyPages = [
  { image: page01, text: ['자유놀이 시간이다!', '토리는 좋아하는 블록 놀이 자리로 향했어요.', '오늘은 가장 좋아하는 빨간 블록으로 멋진 집을 만들고 있었지요.'] },
  { image: page02, text: ['그때 같은 반 친구가 토리에게 다가왔어요.', '“우와, 멋지다! 나도 같이 만들어도 돼?”'] },
  { image: page03, text: ['친구는 토리 옆에 있던 빨간 블록 하나를 집었어요.', '토리는 빨간 블록을 가만히 바라보았어요.', '토리는 어떤 기분이었을까요?'] },
  { image: page04, text: ['친구는 빨간 블록을 내려놓았어요.', '“알겠어…”', '조금 전까지 신나 보이던 친구의 얼굴이 슬퍼보여요.'] },
  { image: page05, text: ['집에 돌아온 뒤에도 토리는 유치원에서 있었던 일이 자꾸 생각났어요.', '혼자 가지고 놀고 싶었던 토리의 마음도 진짜였어요.'] },
  { image: page06, text: ['다음 날, 토리는 다시 블록 놀이 자리로 갔어요.', '어제 친구의 얼굴이 떠올랐어요.', '토리는 어떻게 했을까요?'] },
  { image: page01, text: ['토리는 친구에게 먼저 다가갔어요.', '“우리 같이 집을 만들어 볼래?”'] },
  { image: page02, text: ['친구는 환하게 웃으며 고개를 끄덕였어요.', '둘은 빨간 블록을 함께 놓기 시작했어요.'] },
  { image: page03, text: ['둘이 함께 만든 집에는 멋진 지붕이 생겼어요.', '마음도 조금씩 편안해졌어요.'] },
  { image: page06, text: ['토리는 자기 마음을 말해도 괜찮다는 걸 알게 되었어요.', '친구와 함께하는 놀이도 즐거웠지요.'] },
];

// 쪽마다 따로 만들어지기 전까지는 모든 쪽에 같은 예시 설명·가이드를 보여줘요.
export const SCENE_DESCRIPTION = ['이래서 이 장면이 만들어졌고 저래', '서 이 장면이 만들어졌고 등등등'].join('\n');
export const SCENE_GUIDE = ['이 장면에서는 이렇게 말해보세요', '질문해보세요', '등등등'].join('\n');
