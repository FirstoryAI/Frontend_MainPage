import { birthYearForAge } from '../story/utils';

const CHILD_PROFILE_KEY = 'firstory.childProfile';

export function loadChildProfile({ includeSession = true } = {}) {
  try {
    if (includeSession) {
      const currentSession = window.sessionStorage.getItem(CHILD_PROFILE_KEY);
      if (currentSession) return JSON.parse(currentSession);
    }
    const saved = window.localStorage.getItem(CHILD_PROFILE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function saveChildProfile(child, { persist = true } = {}) {
  if (!child || typeof window === 'undefined') return;

  try {
    const serialized = JSON.stringify(child);
    window.sessionStorage.setItem(CHILD_PROFILE_KEY, serialized);
    if (persist) window.localStorage.setItem(CHILD_PROFILE_KEY, serialized);
  } catch {
    // Storage may be unavailable in private browsing or restricted environments.
  }
}

export function childFromAge(ageText, currentChild) {
  const ageValue = String(ageText).trim();
  if (!ageValue) {
    return { ...currentChild, birthYear: '', birthMonth: '' };
  }

  const age = Number.parseInt(ageValue.replace(/[^0-9]/g, ''), 10);
  if (!Number.isFinite(age) || age < 0 || age > 12) return currentChild;

  const month = Number(currentChild?.birthMonth) || new Date().getMonth() + 1;
  return {
    ...currentChild,
    birthYear: birthYearForAge(age, month),
    birthMonth: month,
  };
}
