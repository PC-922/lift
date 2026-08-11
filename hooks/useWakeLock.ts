import { useEffect, useRef } from 'react';

interface WakeLockSentinel {
  release: () => Promise<void>;
}

function requestWakeLock(): Promise<WakeLockSentinel | null> {
  if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
    return Promise.resolve(null);
  }
  return (navigator as Navigator & { wakeLock: { request: (type: string) => Promise<WakeLockSentinel> } })
    .wakeLock
    .request('screen')
    .catch(() => null);
}

// Keeps the screen awake while `active` is true, re-acquiring when the tab
// becomes visible again (browsers release the lock when the tab is hidden).
export function useWakeLock(active: boolean): void {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    const acquire = async () => {
      const sentinel = await requestWakeLock();
      if (cancelled) {
        sentinel?.release().catch(() => {});
        return;
      }
      sentinelRef.current = sentinel;
    };

    acquire();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        acquire();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      sentinelRef.current?.release().catch(() => {});
      sentinelRef.current = null;
    };
  }, [active]);
}
