import { useState } from 'react';
import { SignupDraftContext } from './signupDraftStore';

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
