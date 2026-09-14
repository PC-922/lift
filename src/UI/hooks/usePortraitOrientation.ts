import { useEffect } from 'react';

interface OrientationWithLock extends ScreenOrientation {
  lock?: (orientation: string) => Promise<void>;
}

function lockPortrait(): void {
  try {
    const orientation = window.screen.orientation as OrientationWithLock;
    if (typeof orientation?.lock === 'function') {
      void orientation.lock('portrait').catch(() => undefined);
    }
  } catch {
    // Orientation locking is optional and unavailable in some browsers.
  }
}

export function usePortraitOrientation(): void {
  useEffect(() => {
    lockPortrait();
    window.addEventListener('orientationchange', lockPortrait);
    window.addEventListener('pointerdown', lockPortrait, { passive: true });
    document.addEventListener('visibilitychange', lockPortrait);

    return () => {
      window.removeEventListener('orientationchange', lockPortrait);
      window.removeEventListener('pointerdown', lockPortrait);
      document.removeEventListener('visibilitychange', lockPortrait);
    };
  }, []);
}
