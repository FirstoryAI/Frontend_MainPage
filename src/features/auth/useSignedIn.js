import { useEffect, useState } from 'react';
import { getCurrentMember } from '../../services/homeApi';

export function useSignedIn() {
  const [isSignedIn, setIsSignedIn] = useState(null);

  useEffect(() => {
    let active = true;

    getCurrentMember()
      .then(() => {
        if (active) setIsSignedIn(true);
      })
      .catch(() => {
        if (active) setIsSignedIn(false);
      });

    return () => { active = false; };
  }, []);

  return isSignedIn;
}
