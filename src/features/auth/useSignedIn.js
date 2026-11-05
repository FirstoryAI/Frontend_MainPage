import { useEffect, useSyncExternalStore } from 'react';
import { getCurrentMember } from '../../services/homeApi';

let cachedSignedIn = null;
let statusRevision = 0;
const listeners = new Set();

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return cachedSignedIn;
}

export function setSignedInStatus(isSignedIn) {
  statusRevision += 1;
  cachedSignedIn = isSignedIn;
  listeners.forEach((listener) => listener());
}

export function useSignedIn() {
  const isSignedIn = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    let active = true;
    const requestRevision = statusRevision;

    getCurrentMember()
      .then(() => {
        if (active && requestRevision === statusRevision) {
          setSignedInStatus(true);
        }
      })
      .catch(() => {
        if (active && requestRevision === statusRevision) {
          setSignedInStatus(false);
        }
      });

    return () => { active = false; };
  }, []);

  return isSignedIn;
}
