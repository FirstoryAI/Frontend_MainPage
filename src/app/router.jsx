import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import HomePage from '../pages/HomePage/HomePage';
import LibraryPage from '../pages/LibraryPage/LibraryPage';
import RouteErrorPage from './RouteErrorPage';

const page = (load) => async () => ({ Component: (await load()).default });

export const router = createBrowserRouter([
  {
    element: <App />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/', Component: HomePage },
      { path: '/auth', lazy: page(() => import('../pages/AuthStartPage/AuthStartPage')) },
      { path: '/auth/email/signup', lazy: page(() => import('../pages/EmailSignUpPage/EmailSignUpPage')) },
      { path: '/auth/email/login', lazy: page(() => import('../pages/EmailLoginPage/EmailLoginPage')) },
      { path: '/oauth/kakao', lazy: page(() => import('../pages/KakaoCallbackPage/KakaoCallbackPage')) },
      { path: '/auth/kakao/signup', lazy: page(() => import('../pages/KakaoSignUpPage/KakaoSignUpPage')) },
      { path: '/auth/password/reset', lazy: page(() => import('../pages/PasswordResetPage/PasswordResetPage')) },
      { path: '/auth/consent', lazy: page(() => import('../pages/GuardianConsentPage/GuardianConsentPage')) },
      { path: '/home', Component: HomePage },
      { path: '/mypage', lazy: page(() => import('../pages/MyPage/MyPage')) },
      { path: '/library', Component: LibraryPage },
      { path: '/library/:storyId', lazy: page(() => import('../pages/StoryDetailPage/StoryDetailPage')) },
      { path: '/scenarios', lazy: page(() => import('../pages/ScenarioListPage/ScenarioListPage')) },
      { path: '/story/new', lazy: page(() => import('../pages/StoryCreatePage/StoryCreateRoute')) },
      { path: '/story/:storyId/preview', lazy: page(() => import('../pages/StoryPreviewPage/StoryPreviewPage')) },
      { path: '/story/:storyId/remake', lazy: page(() => import('../pages/StoryRemakePage/StoryRemakePage')) },
      { path: '*', lazy: page(() => import('../pages/NotFoundPage/NotFoundPage')) },
    ],
  },
]);
