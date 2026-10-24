function storageKey(identity) {
  const accountKey = identity?.trim().toLowerCase() || 'default';
  return `firstory.onboardingSeen:${encodeURIComponent(accountKey)}`;
}

export function hasSeenOnboarding(identity) {
  try {
    return window.localStorage.getItem(storageKey(identity)) === 'true';
  } catch {
    return false;
  }
}

export function markOnboardingSeen(identity) {
  try {
    window.localStorage.setItem(storageKey(identity), 'true');
  } catch {
    // Keep onboarding usable when browser storage is unavailable.
  }
}
