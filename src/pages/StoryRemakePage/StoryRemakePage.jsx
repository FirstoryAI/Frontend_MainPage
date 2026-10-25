import StoryPreviewPage from '../StoryPreviewPage/StoryPreviewPage';

// 서재에서 만들지 못한 동화를 다시 만들 때: 미리보기 위에 '다시 만들기' 팝업을 열어 둔 채로 시작해요.
function StoryRemakePage() {
  return <StoryPreviewPage initialRemakeOpen />;
}

export default StoryRemakePage;
