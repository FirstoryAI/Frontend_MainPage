const STORAGE_KEY = 'firstory-story-drafts';

export function readStoryDrafts() {
  try {
    const drafts = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(drafts) ? drafts : [];
  } catch {
    return [];
  }
}

export function saveStoryDraft(draft) {
  const drafts = readStoryDrafts();
  const id = draft.id || (typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `draft-${Date.now()}`);
  const savedDraft = { ...draft, id, savedAt: new Date().toISOString() };
  const nextDrafts = [savedDraft, ...drafts.filter((item) => item.id !== id)];

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDrafts));
  } catch {
    // Private browsing or a full storage quota should not interrupt leaving the editor.
  }

  return savedDraft;
}

export function deleteStoryDraft(id) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(readStoryDrafts().filter((draft) => draft.id !== id)),
    );
  } catch {
    // Ignore unavailable browser storage.
  }
}

export function getDraftTitle(draft) {
  return draft.detail?.event?.trim() || draft.detail?.category || '새로운 동화';
}

export function formatDraftDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '방금 전 저장';
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}
