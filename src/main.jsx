import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { initializeCsrf } from './services/apiClient';
import './styles/reset.css';
import './styles/variables.css';
import './styles/global.css';

initializeCsrf().catch(() => {
  // Keep the app usable while the local backend is stopped; mutating requests
  // will retry CSRF initialization when they are made.
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
