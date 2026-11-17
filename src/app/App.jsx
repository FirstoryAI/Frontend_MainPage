import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import FeedbackDialog from '../features/story/components/FeedbackDialog';
import { getFeedbackSubmission, markFeedbackSubmitted } from '../features/story/feedbackSubmission';
import { clearPendingReadingFeedback, getPendingReadingFeedback } from '../features/story/pendingReadingFeedback';
import { useSceneScale } from '../features/story/hooks/useSceneScale';
import { useSignedIn } from '../features/auth/useSignedIn';
import { SignupDraftProvider } from '../features/auth/SignupDraftContext';
import { NotificationsProvider } from '../features/notifications/NotificationsProvider';
import { StoryGenerationProvider } from '../features/story/generation/StoryGenerationProvider';
import { completeReading } from '../services/readingApi';

function App() {
  const isSignedIn = useSignedIn();
  const sceneScale = useSceneScale();
  const [pendingFeedback, setPendingFeedback] = useState(null);

  useEffect(() => {
    if (!isSignedIn) return undefined;
    const pending = getPendingReadingFeedback();
    if (!pending) return undefined;
    let active = true;
    getFeedbackSubmission('reading').then(async ({ memberId, submitted }) => {
      if (!active || memberId !== pending.memberId) return;
      if (submitted) {
        try {
          await completeReading(pending.sessionId);
          clearPendingReadingFeedback(pending.sessionId);
        } catch {
          // 다음 접속 때 다시 시도해요.
        }
      } else {
        setPendingFeedback(pending);
      }
    });
    return () => { active = false; };
  }, [isSignedIn]);

  const submitPendingFeedback = async (feedback) => {
    try {
      await completeReading(pendingFeedback.sessionId, feedback);
      markFeedbackSubmitted(pendingFeedback.memberId, 'reading');
      clearPendingReadingFeedback(pendingFeedback.sessionId);
      setPendingFeedback(null);
    } catch (error) {
      return error.message || '읽기를 마치지 못했어요.';
    }
  };

  return (
    <SignupDraftProvider>
      <NotificationsProvider>
        <StoryGenerationProvider>
          <Outlet />
          {pendingFeedback && <FeedbackDialog variant="reading" sceneScale={sceneScale} onSubmit={submitPendingFeedback} />}
        </StoryGenerationProvider>
      </NotificationsProvider>
    </SignupDraftProvider>
  );
}

export default App;
