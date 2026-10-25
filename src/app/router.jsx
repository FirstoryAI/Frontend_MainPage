import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import HomePage from '../pages/HomePage/HomePage';
import EmailSignUpPage from '../pages/EmailSignUpPage/EmailSignUpPage';
import EmailLoginPage from '../pages/EmailLoginPage/EmailLoginPage';
import GuardianConsentPage from '../pages/GuardianConsentPage/GuardianConsentPage';
import DashboardPage from '../pages/DashboardPage/DashboardPage';
import LibraryPage from '../pages/LibraryPage/LibraryPage';
import ScenarioListPage from '../pages/ScenarioListPage/ScenarioListPage';
import StoryCreatePage from '../pages/StoryCreatePage/StoryCreatePage';
import StoryDetailPage from '../pages/StoryDetailPage/StoryDetailPage';
import StoryGuidePage from '../pages/StoryGuidePage/StoryGuidePage';
import StoryRemakePage from '../pages/StoryRemakePage/StoryRemakePage';
import StoryPreviewPage from '../pages/StoryPreviewPage/StoryPreviewPage';
import NotFoundPage from '../pages/NotFoundPage/NotFoundPage';
import MyPage from '../pages/MyPage/MyPage';

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/auth/email/signup', element: <EmailSignUpPage /> },
      { path: '/auth/email/login', element: <EmailLoginPage /> },
      { path: '/auth/consent', element: <GuardianConsentPage /> },
      { path: '/home', element: <DashboardPage /> },
      { path: '/mypage', element: <MyPage /> },
      { path: '/library', element: <LibraryPage /> },
      { path: '/library/:storyId', element: <StoryDetailPage /> },
      { path: '/library/:storyId/guide', element: <StoryGuidePage /> },
      { path: '/scenarios', element: <ScenarioListPage /> },
      { path: '/story/new', element: <StoryCreatePage /> },
      { path: '/story/preview', element: <StoryPreviewPage /> },
      { path: '/story/:storyId/remake', element: <StoryRemakePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
