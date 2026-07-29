import React, { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { Exercise, Routine } from '../types';
import { storageManager } from '../services/storageService';

interface AppDataContextValue {
  exercises: Exercise[];
  muscleGroups: string[];
  routines: Routine[];
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export const AppDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
    async function triggerSync() {
      if (typeof navigator !== 'undefined' && navigator.onLine && typeof storageManager.sync === 'function') {
        await storageManager.sync();
        await refresh();
      }
    }
    triggerSync();
    window.addEventListener('online', triggerSync);
    return () => window.removeEventListener('online', triggerSync);
  }, [refresh]);

  return (
    <AppDataContext.Provider value={{ exercises, muscleGroups, routines, isLoading, refresh }}>
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
