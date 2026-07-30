import { useMemo } from 'react';
import { useAppData } from './useAppData';

export type SyncState =
  | 'online'
  | 'offline'
  | 'syncing'
  | 'pending'
  | 'synced'
  | 'error';

export interface SyncStatus {
  state: SyncState;
  hasPendingWrites: boolean;
  fromCache: boolean;
  isOnline: boolean;
}

export function useSyncStatus(): SyncStatus {
  const { syncStatus } = useAppData();
  const isOnline = typeof navigator !== 'undefined' && navigator.onLine;

  return useMemo(() => {
    if (!syncStatus) {
      return {
        state: isOnline ? 'online' : 'offline',
        hasPendingWrites: false,
        fromCache: false,
        isOnline,
      };
    }

    if (syncStatus.hasPendingWrites) {
      return {
        state: isOnline ? 'syncing' : 'pending',
        hasPendingWrites: true,
        fromCache: syncStatus.fromCache,
        isOnline,
      };
    }

    if (syncStatus.fromCache) {
      return {
        state: isOnline ? 'online' : 'offline',
        hasPendingWrites: false,
        fromCache: true,
        isOnline,
      };
    }

    return {
      state: 'synced',
      hasPendingWrites: false,
      fromCache: false,
      isOnline,
    };
  }, [syncStatus, isOnline]);
}
