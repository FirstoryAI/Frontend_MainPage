import { useContext } from 'react';
import { SignupDraftContext } from './signupDraftStore';

export function useSignupDraft() {
  const context = useContext(SignupDraftContext);

  if (!context) {
    throw new Error('useSignupDraft must be used inside SignupDraftProvider');
  }

  return context;
}
