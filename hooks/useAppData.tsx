import React, { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { Exercise, Routine } from '../types';
import { storageManager, getCurrentSyncAdapter } from '../services/storageService';
import { SyncStatusSnapshot } from '../services/storage/firestoreGateway';

interface AppDataContextValue {
  exercises: Exercise[];
  muscleGroups: string[];
  routines: Routine[];
  isLoading: boolean;
  syncStatus: SyncStatusSnapshot | null;
  refresh: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export const AppDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatusSnapshot | null>(null);

  const refresh = useCallback(async () => {
    const [loadedExercises, loadedGroups, loadedRoutines] = await Promise.all([
      storageManager.getExercises(),
      storageManager.getMuscleGroups(),
      storageManager.getRoutines(),
    ]);
    setExercises(loadedExercises);
    setMuscleGroups(loadedGroups);
    setRoutines(loadedRoutines);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    refresh();
  }, [refresh]);

  useEffect(() => {
    const syncAdapter = getCurrentSyncAdapter();
    if (!syncAdapter) {
      setSyncStatus(null);
      return;
    }

    const unsubscribeData = syncAdapter.subscribe((data) => {
      setExercises(data.exercises);
      setMuscleGroups(data.groups);
      setRoutines(data.routines);
      setIsLoading(false);
    });

    const unsubscribeStatus = syncAdapter.subscribeStatus((status) => {
      setSyncStatus(status);
    });

    return () => {
      unsubscribeData();
      unsubscribeStatus();
    };
  }, []);

  useEffect(() => {
    async function triggerSync() {
      if (typeof navigator !== 'undefined' && navigator.onLine && typeof storageManager.sync === 'function') {
        await storageManager.sync();
      }
    }
    triggerSync();
    window.addEventListener('online', triggerSync);
    return () => window.removeEventListener('online', triggerSync);
  }, []);

  return (
    <AppDataContext.Provider value={{ exercises, muscleGroups, routines, isLoading, syncStatus, refresh }}>
      {children}
    </AppDataContext.Provider>
  );
};

export function useAppData(): AppDataContextValue {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
}
