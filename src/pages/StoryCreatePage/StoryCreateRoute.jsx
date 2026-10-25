import { useLocation } from 'react-router-dom';
import StoryCreatePage from './StoryCreatePage';

// 이어 만들기·만드는 중 화면처럼 같은 주소로 다시 들어와도 처음부터 새로 시작하도록 이동할 때마다 화면을 새로 만들어요.
function StoryCreateRoute() {
  const location = useLocation();
  return <StoryCreatePage key={location.key} />;
}

export default StoryCreateRoute;
