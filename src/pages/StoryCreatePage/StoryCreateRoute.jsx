import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import StoryCreatePage from './StoryCreatePage';
import { getFreeStoryRemaining } from '../../features/home/storyQuota';

// 이어 만들기·만드는 중 화면처럼 같은 주소로 다시 들어와도 처음부터 새로 시작하도록 이동할 때마다 화면을 새로 만들어요.
function StoryCreateRoute() {
  const location = useLocation();
  const [allowed, setAllowed] = useState(() => location.state?.generation ? true : null);

  useEffect(() => {
    if (location.state?.generation) return undefined;
    let active = true;
    getFreeStoryRemaining()
      .then((count) => { if (active) setAllowed(count > 0); })
      .catch(() => { if (active) setAllowed(true); });
    return () => { active = false; };
  }, [location.state]);

  if (allowed === null) return null;
  if (!allowed) return <Navigate to="/home" replace state={{ launchNotice: true }} />;
  return <StoryCreatePage key={location.key} />;
}

export default StoryCreateRoute;
