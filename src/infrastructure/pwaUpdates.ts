export function registerPwaUpdate(
  updateSW: (reloadPage?: boolean) => Promise<void>
): {
  onNeedRefresh: () => void;
  onRegistered: (r: ServiceWorkerRegistration | undefined) => void;
} {
  let updateCheckInterval: ReturnType<typeof setInterval> | undefined;

  function applyUpdate() {
    updateSW(true).catch(() => {
      // If the immediate reload fails, the next navigation will pick up the new SW.
    });
  }

  function onNeedRefresh() {
    if (document.hidden) {
      applyUpdate();
      return;
    }

    const handleVisibility = () => {
      if (document.hidden) {
        applyUpdate();
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
  }

  function onRegistered(r: ServiceWorkerRegistration | undefined) {
    if (!r) return;

    updateCheckInterval = setInterval(() => {
      r.update();
    }, 60 * 60 * 1000);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        r.update();
      }
    });
  }

  return { onNeedRefresh, onRegistered };
}
