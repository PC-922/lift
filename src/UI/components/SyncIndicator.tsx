import React, { useEffect, useState } from 'react';
import { CloudOff, RefreshCw } from 'lucide-react';
import { useAppData } from '../hooks/useAppData';
import { useTranslations } from '../utils/translations';

// The "Syncing" state is transient: it fades out shortly after the last
// pending-write event, so a stuck queue does not pin it on screen forever.
const SYNC_VISIBLE_MS = 4000;

export const SyncIndicator: React.FC = () => {
  const { syncStatus } = useAppData();
  const t = useTranslations();
  const [syncingVisible, setSyncingVisible] = useState(false);

  useEffect(() => {
    if (!syncStatus?.hasPendingWrites) {
      setSyncingVisible(false);
      return;
    }
    setSyncingVisible(true);
    const timer = setTimeout(() => setSyncingVisible(false), SYNC_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [syncStatus]);

  if (!syncStatus) return null;

  const isOnline = typeof navigator === 'undefined' || navigator.onLine;
  const isOffline = syncStatus.fromCache && !isOnline;

  if (!isOffline && !syncingVisible) return null;

  return (
    <span className="flex items-center gap-1 rounded-full bg-app-surface-muted px-2 py-1 text-[10px] font-semibold text-app-text-muted">
      {isOffline ? <CloudOff size={12} /> : <RefreshCw size={12} />}
      {isOffline ? t.labels.offlineMode : t.labels.syncing}
    </span>
  );
};
