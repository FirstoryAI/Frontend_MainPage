import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import HomePage from '../pages/HomePage/HomePage';
import EmailSignUpPage from '../pages/EmailSignUpPage/EmailSignUpPage';
import GuardianConsentPage from '../pages/GuardianConsentPage/GuardianConsentPage';
import NotFoundPage from '../pages/NotFoundPage/NotFoundPage';

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/auth/email/signup', element: <EmailSignUpPage /> },
      { path: '/auth/consent', element: <GuardianConsentPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
