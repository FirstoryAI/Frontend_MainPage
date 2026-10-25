import { Outlet } from 'react-router-dom';
import { SignupDraftProvider } from '../features/auth/SignupDraftContext';
import { NotificationsProvider } from '../features/notifications/NotificationsProvider';
import { StoryGenerationProvider } from '../features/story/generation/StoryGenerationProvider';

function App() {
  return (
    <SignupDraftProvider>
      <NotificationsProvider>
        <StoryGenerationProvider>
          <Outlet />
        </StoryGenerationProvider>
      </NotificationsProvider>
    </SignupDraftProvider>
  );
}

export default App;
