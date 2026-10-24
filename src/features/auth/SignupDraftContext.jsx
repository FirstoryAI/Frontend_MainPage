import { createContext, useContext, useState } from 'react';

const SignupDraftContext = createContext(null);

export function SignupDraftProvider({ children }) {
  const [signupDraft, setSignupDraft] = useState(null);
  const [signupFeedback, setSignupFeedback] = useState(null);

  return (
    <SignupDraftContext.Provider
      value={{ signupDraft, setSignupDraft, signupFeedback, setSignupFeedback }}
    >
      {children}
    </SignupDraftContext.Provider>
  );
}

export function useSignupDraft() {
  const context = useContext(SignupDraftContext);

  if (!context) {
    throw new Error('useSignupDraft must be used inside SignupDraftProvider');
  }

  return context;
}
