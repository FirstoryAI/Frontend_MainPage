import { Outlet } from 'react-router-dom';
import { SignupDraftProvider } from '../features/auth/SignupDraftContext';

function App() {
  return (
    <SignupDraftProvider>
      <Outlet />
    </SignupDraftProvider>
  );
}

export default App;
