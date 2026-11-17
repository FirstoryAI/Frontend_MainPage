import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { watchPreloadErrors } from './app/chunkReload';
import { initializeCsrf } from './services/apiClient';
import './styles/reset.css';
import './styles/variables.css';
import './styles/global.css';

watchPreloadErrors();

initializeCsrf().catch(() => {
  // Keep the app usable while the local backend is stopped; mutating requests
  // will retry CSRF initialization when they are made.
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} fallbackElement={<div role="status" aria-label="화면을 불러오는 중" />} />
  </StrictMode>,
);
