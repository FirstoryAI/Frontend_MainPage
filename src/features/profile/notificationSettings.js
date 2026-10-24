export const NOTIFICATION_SETTINGS_KEY = 'firstory.notificationSettings';

const defaultSettings = { email: false, kakao: false, marketing: true };

export function loadNotificationSettings() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(NOTIFICATION_SETTINGS_KEY) ?? '{}');
    return { ...defaultSettings, ...saved };
  } catch {
    return defaultSettings;
  }
}

export function saveNotificationSettings(settings) {
  try {
    window.localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Keep the preference active in the current UI if browser storage is unavailable.
  }
}
