import { flushSync } from 'react-dom';

// Crossfade a full-screen view that changes within the current route.
export function transitionScene(update) {
  if (typeof document.startViewTransition !== 'function'
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    update();
    return;
  }

  document.startViewTransition(() => flushSync(update)).finished.catch(() => {});
}
