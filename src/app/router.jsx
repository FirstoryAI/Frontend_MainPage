import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import HomePage from '../pages/HomePage/HomePage';
import EmailSignUpPage from '../pages/EmailSignUpPage/EmailSignUpPage';
import GuardianConsentPage from '../pages/GuardianConsentPage/GuardianConsentPage';
import DashboardPage from '../pages/DashboardPage/DashboardPage';
import LibraryPage from '../pages/LibraryPage/LibraryPage';
import StoryCreatePage from '../pages/StoryCreatePage/StoryCreatePage';
import StoryRemakePage from '../pages/StoryRemakePage/StoryRemakePage';
import StoryPreviewPage from '../pages/StoryPreviewPage/StoryPreviewPage';
import NotFoundPage from '../pages/NotFoundPage/NotFoundPage';

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/auth/email/signup', element: <EmailSignUpPage /> },
      { path: '/auth/consent', element: <GuardianConsentPage /> },
      { path: '/home', element: <DashboardPage /> },
      { path: '/library', element: <LibraryPage /> },
      { path: '/story/new', element: <StoryCreatePage /> },
      { path: '/story/preview', element: <StoryPreviewPage /> },
      { path: '/story/:storyId/remake', element: <StoryRemakePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
