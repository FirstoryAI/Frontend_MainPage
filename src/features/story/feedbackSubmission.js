import { getCurrentMember } from '../../services/homeApi';

const storageKey = (memberId, kind) => `firstory.feedbackSubmitted:${memberId}:${kind}`;

export async function getFeedbackSubmission(kind) {
  try {
    const member = await getCurrentMember();
    const memberId = member.id;
    const submittedOnServer = member.feedbackSubmitted?.[kind] === true;
    let submittedLocally = false;
    try {
      submittedLocally = window.localStorage.getItem(storageKey(memberId, kind)) === 'true';
    } catch {
      // Browser storage can be unavailable in private or restricted contexts.
    }
    return { memberId, submitted: submittedOnServer || submittedLocally };
  } catch {
    // If account status cannot be checked, keep asking rather than skipping feedback.
    return { memberId: null, submitted: false };
  }
}

export function markFeedbackSubmitted(memberId, kind) {
  if (memberId == null) return;
  try {
    window.localStorage.setItem(storageKey(memberId, kind), 'true');
  } catch {
    // The backend remains the source of truth when local storage is unavailable.
  }
}
