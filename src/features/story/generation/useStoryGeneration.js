import { useContext } from 'react';
import { StoryGenerationContext } from './storyGenerationContext';

export function useStoryGeneration() {
  const context = useContext(StoryGenerationContext);

  if (!context) {
    throw new Error('useStoryGeneration must be used inside StoryGenerationProvider');
  }

  return context;
}
