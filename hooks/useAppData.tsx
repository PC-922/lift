import React, { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { Exercise, ExerciseLog, GroupSortPreference, Routine, RoutineDay, RoutineExercise } from '../types';
import { createDataStore, DataStore, DataStoreStatus } from '../services/storageService';
import { migrateLegacyDataIfNeeded } from '../services/storage/legacyMigration';
import { exportData as serializeBackup, importData as parseBackup } from '../services/exportImport';
import { importSharedRoutine, parseSharedRoutine } from '../services/routineShareService';
import { DEFAULT_GROUP_SORT_PREFERENCE } from '../utils/exerciseSorting';
import { useAuth } from './useAuth';

interface AppDataContextValue {
  exercises: Exercise[];
  muscleGroups: string[];
  routines: Routine[];
  groupSortPreference: GroupSortPreference;
  isLoading: boolean;
  syncStatus: DataStoreStatus | null;
  saveExercise(exercise: Exercise): Promise<void>;
  deleteExercise(id: string): Promise<void>;
  updateExerciseDetails(id: string, name: string, muscleGroup: string): Promise<void>;
  updateExerciseNote(id: string, note: string): Promise<void>;
  updateExerciseLog(exerciseId: string, originalDate: string, log: ExerciseLog): Promise<void>;
  deleteExerciseLog(exerciseId: string, date: string): Promise<void>;
  deleteAllLogs(exerciseId: string): Promise<void>;
  deleteAllLogsExceptLatest(exerciseId: string): Promise<void>;
  logSession(exerciseId: string, weight: number | null, reps: number | null): Promise<void>;
  addMuscleGroup(group: string): Promise<void>;
  deleteMuscleGroup(group: string): Promise<void>;
  renameMuscleGroup(oldName: string, newName: string): Promise<void>;
  saveGroupSortPreference(preference: GroupSortPreference): Promise<void>;
  saveRoutine(routine: Routine): Promise<void>;
  deleteRoutine(id: string): Promise<void>;
  reorderRoutine(fromIndex: number, toIndex: number): Promise<void>;
  reorderRoutineExercise(routineId: string, dayId: string, fromIndex: number, toIndex: number): Promise<void>;
  exportData(): Promise<string>;
  importData(jsonString: string): Promise<boolean>;
  importRoutine(jsonString: string): Promise<boolean>;
  resetData(): Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

function nowIso(): string {
  return new Date().toISOString();
}

function updateRoutineDay(day: RoutineDay, exerciseId: string, updater: (re: RoutineExercise) => RoutineExercise): RoutineDay {
  return {
    ...day,
    exercises: day.exercises.map((re) =>
      re.exerciseId === exerciseId || re.alternativeExerciseId === exerciseId ? updater(re) : re
    ),
  };
}

export const AppDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const uid = user?.uid;

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [groupSortPreference, setGroupSortPreference] = useState<GroupSortPreference>(DEFAULT_GROUP_SORT_PREFERENCE);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<DataStoreStatus | null>(null);

  const dataStoreRef = useRef<DataStore | null>(null);

  useEffect(() => {
    if (!uid) return;

    setIsLoading(true);
    const dataStore = createDataStore(uid);
    dataStoreRef.current = dataStore;

    let unsubscribe: (() => void) | undefined;

    migrateLegacyDataIfNeeded(dataStore).then(() => {
      unsubscribe = dataStore.subscribe(
        (snapshot) => {
          setExercises(snapshot.exercises);
          setRoutines(snapshot.routines);
          setMuscleGroups(snapshot.muscleGroups);
          setGroupSortPreference(snapshot.groupSortPreference);
          setIsLoading(false);
        },
        (status) => setSyncStatus(status)
      );
    });

    return () => {
      unsubscribe?.();
      dataStoreRef.current = null;
    };
  }, [uid]);

  const requireDataStore = useCallback((): DataStore | null => {
    return dataStoreRef.current;
  }, []);

  const saveExercise = useCallback(
    async (exercise: Exercise) => {
      const dataStore = requireDataStore();
      if (!dataStore) return;
      await dataStore.saveExercise({ ...exercise, updatedAt: nowIso() });
    },
    []
  );

  const deleteExercise = useCallback(
    async (id: string) => {
      const dataStore = requireDataStore();
      if (!dataStore) return;
      await dataStore.deleteExercise(id);
    },
    []
  );

  const updateExerciseDetails = useCallback(
    async (id: string, name: string, muscleGroup: string) => {
      const exercise = exercises.find((e) => e.id === id);
      if (!exercise) return;
      await saveExercise({ ...exercise, name, muscleGroup, updatedAt: nowIso() });
    },
    [exercises, saveExercise]
  );

  const updateExerciseNote = useCallback(
    async (id: string, note: string) => {
      const exercise = exercises.find((e) => e.id === id);
      if (!exercise) return;
      const trimmedNote = note.trim();
      await saveExercise({
        ...exercise,
        note: trimmedNote.length > 0 ? trimmedNote : undefined,
        updatedAt: nowIso(),
      });
    },
    [exercises, saveExercise]
  );

  const updateExerciseLog = useCallback(
    async (exerciseId: string, originalDate: string, log: ExerciseLog) => {
      const exercise = exercises.find((e) => e.id === exerciseId);
      if (!exercise) return;
      const originalIndex = exercise.logs.findIndex((item) => item.date === originalDate);
      if (originalIndex === -1) return;

      const logs = [...exercise.logs];
      const existingIndex = logs.findIndex((item) => item.date === log.date);
      if (existingIndex !== -1 && existingIndex !== originalIndex) {
        logs[existingIndex] = log;
        logs.splice(originalIndex, 1);
      } else {
        logs[originalIndex] = log;
      }
      await saveExercise({ ...exercise, logs, updatedAt: nowIso() });
    },
    [exercises, saveExercise]
  );

  const deleteExerciseLog = useCallback(
    async (exerciseId: string, date: string) => {
      const exercise = exercises.find((e) => e.id === exerciseId);
      if (!exercise) return;
      await saveExercise({
        ...exercise,
        logs: exercise.logs.filter((log) => log.date !== date),
        updatedAt: nowIso(),
      });
    },
    [exercises, saveExercise]
  );

  const deleteAllLogs = useCallback(
    async (exerciseId: string) => {
      const exercise = exercises.find((e) => e.id === exerciseId);
      if (!exercise) return;
      await saveExercise({ ...exercise, logs: [], updatedAt: nowIso() });
    },
    [exercises, saveExercise]
  );

  const deleteAllLogsExceptLatest = useCallback(
    async (exerciseId: string) => {
      const exercise = exercises.find((e) => e.id === exerciseId);
      if (!exercise || exercise.logs.length <= 1) return;
      const sorted = [...exercise.logs].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      await saveExercise({ ...exercise, logs: [sorted[0]], updatedAt: nowIso() });
    },
    [exercises, saveExercise]
  );

  const logSession = useCallback(
    async (exerciseId: string, weight: number | null, reps: number | null) => {
      const exercise = exercises.find((e) => e.id === exerciseId);
      if (!exercise) return;
      const today = nowIso().split('T')[0];
      const existingIndex = exercise.logs.findIndex((log) => log.date === today);
      let logs: ExerciseLog[];
      if (existingIndex >= 0) {
        logs = exercise.logs.map((log, index) =>
          index === existingIndex ? { date: today, weight, reps } : log
        );
      } else {
        logs = [...exercise.logs, { date: today, weight, reps }];
      }
      await saveExercise({ ...exercise, logs, updatedAt: nowIso() });
    },
    [exercises, saveExercise]
  );

  const addMuscleGroup = useCallback(
    async (group: string) => {
      const dataStore = requireDataStore();
      if (!dataStore || muscleGroups.includes(group)) return;
      await dataStore.saveMuscleGroups([...muscleGroups, group]);
    },
    [muscleGroups]
  );

  const deleteMuscleGroup = useCallback(
    async (group: string) => {
      const dataStore = requireDataStore();
      if (!dataStore) return;

      const updatedGroups = muscleGroups.filter((g) => g !== group);
      const removedExerciseIds = new Set(exercises.filter((e) => e.muscleGroup === group).map((e) => e.id));

      await dataStore.saveMuscleGroups(updatedGroups);

      for (const exercise of exercises) {
        if (exercise.muscleGroup === group) {
          await dataStore.deleteExercise(exercise.id);
        }
      }

      for (const routine of routines) {
        const cleanedDays = routine.days.map((day) => ({
          ...day,
          exercises: day.exercises
            .filter((re) => !removedExerciseIds.has(re.exerciseId))
            .map((re) =>
              re.alternativeExerciseId && removedExerciseIds.has(re.alternativeExerciseId)
                ? { ...re, alternativeExerciseId: undefined }
                : re
            ),
        }));
        if (cleanedDays.some((day, index) => day.exercises.length !== routine.days[index].exercises.length)) {
          await dataStore.saveRoutine({ ...routine, days: cleanedDays, updatedAt: nowIso() });
        }
      }
    },
    [exercises, routines, muscleGroups]
  );

  const renameMuscleGroup = useCallback(
    async (oldName: string, newName: string) => {
      const dataStore = requireDataStore();
      if (!dataStore) return;
      if (!muscleGroups.includes(oldName) || muscleGroups.includes(newName)) return;

      const updatedGroups = muscleGroups.map((g) => (g === oldName ? newName : g));
      await dataStore.saveMuscleGroups(updatedGroups);

      for (const exercise of exercises) {
        if (exercise.muscleGroup === oldName) {
          await dataStore.saveExercise({ ...exercise, muscleGroup: newName, updatedAt: nowIso() });
        }
      }
    },
    [exercises, muscleGroups]
  );

  const saveGroupSortPreference = useCallback(
    async (preference: GroupSortPreference) => {
      const dataStore = requireDataStore();
      if (!dataStore) return;
      await dataStore.saveGroupSortPreference(preference);
    },
    []
  );

  const saveRoutine = useCallback(
    async (routine: Routine) => {
      const dataStore = requireDataStore();
      if (!dataStore) return;
      const existing = routines.find((r) => r.id === routine.id);
      const order = existing?.order ?? routines.length;
      await dataStore.saveRoutine({ ...routine, order, updatedAt: nowIso() });
    },
    [routines]
  );

  const deleteRoutine = useCallback(
    async (id: string) => {
      const dataStore = requireDataStore();
      if (!dataStore) return;
      await dataStore.deleteRoutine(id);
    },
    []
  );

  const reorderRoutine = useCallback(
    async (fromIndex: number, toIndex: number) => {
      const dataStore = requireDataStore();
      if (!dataStore) return;
      if (fromIndex < 0 || fromIndex >= routines.length || toIndex < 0 || toIndex >= routines.length) return;
      const items = [...routines];
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);
      for (let i = 0; i < items.length; i++) {
        if (items[i].order !== i) {
          await dataStore.saveRoutine({ ...items[i], order: i, updatedAt: nowIso() });
        }
      }
    },
    [routines]
  );

  const reorderRoutineExercise = useCallback(
    async (routineId: string, dayId: string, fromIndex: number, toIndex: number) => {
      const dataStore = requireDataStore();
      if (!dataStore) return;
      const routine = routines.find((r) => r.id === routineId);
      if (!routine) return;
      const day = routine.days.find((d) => d.id === dayId);
      if (!day) return;
      const items = [...day.exercises];
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);
      await dataStore.saveRoutine({
        ...routine,
        days: routine.days.map((d) => (d.id === dayId ? { ...d, exercises: items } : d)),
        updatedAt: nowIso(),
      });
    },
    [routines]
  );

  const exportData = useCallback(async () => {
    return serializeBackup({
      exercises,
      muscleGroups,
      routines,
      sortPreference: groupSortPreference,
    });
  }, [exercises, muscleGroups, routines, groupSortPreference]);

  const importData = useCallback(
    async (jsonString: string) => {
      const dataStore = requireDataStore();
      if (!dataStore) return false;
      const data = parseBackup(jsonString);
      if (!data) return false;

      const exerciseBaseOrder = exercises.reduce((max, item) => {
        const value = item.order;
        return typeof value === 'number' && value > max ? value : max;
      }, -1);
      const routineBaseOrder = routines.reduce((max, item) => {
        const value = item.order;
        return typeof value === 'number' && value > max ? value : max;
      }, -1);

      await dataStore.saveMuscleGroups(data.muscleGroups);
      await dataStore.saveGroupSortPreference(data.sortPreference);
      data.exercises.forEach((exercise, index) => {
        const order = typeof exercise.order === 'number' ? exercise.order : exerciseBaseOrder + 1 + index;
        void dataStore.saveExercise({ ...exercise, order });
      });
      data.routines.forEach((routine, index) => {
        const order = typeof routine.order === 'number' ? routine.order : routineBaseOrder + 1 + index;
        void dataStore.saveRoutine({ ...routine, order, updatedAt: nowIso() });
      });
      return true;
    },
    [exercises, routines]
  );

  const importRoutine = useCallback(
    async (jsonString: string) => {
      const dataStore = requireDataStore();
      if (!dataStore) return false;
      const shared = parseSharedRoutine(jsonString);
      if (!shared) return false;

      const { routine, createdExercises } = importSharedRoutine(shared, exercises, muscleGroups);
      const updatedGroups = new Set(muscleGroups);
      createdExercises.forEach((exercise) => updatedGroups.add(exercise.muscleGroup));

      const exerciseBaseOrder = exercises.reduce((max, item) => {
        const value = item.order;
        return typeof value === 'number' && value > max ? value : max;
      }, -1);

      await dataStore.saveMuscleGroups(Array.from(updatedGroups));
      createdExercises.forEach((exercise, index) => {
        const order = typeof exercise.order === 'number' ? exercise.order : exerciseBaseOrder + 1 + index;
        void dataStore.saveExercise({ ...exercise, order });
      });
      await dataStore.saveRoutine({ ...routine, order: routines.length, updatedAt: nowIso() });
      return true;
    },
    [exercises, muscleGroups, routines]
  );

  const resetData = useCallback(async () => {
    const dataStore = requireDataStore();
    if (!dataStore) return;
    await dataStore.resetData();
  }, []);

  const value: AppDataContextValue = {
    exercises,
    muscleGroups,
    routines,
    groupSortPreference,
    isLoading,
    syncStatus,
    saveExercise,
    deleteExercise,
    updateExerciseDetails,
    updateExerciseNote,
    updateExerciseLog,
    deleteExerciseLog,
    deleteAllLogs,
    deleteAllLogsExceptLatest,
    logSession,
    addMuscleGroup,
    deleteMuscleGroup,
    renameMuscleGroup,
    saveGroupSortPreference,
    saveRoutine,
    deleteRoutine,
    reorderRoutine,
    reorderRoutineExercise,
    exportData,
    importData,
    importRoutine,
    resetData,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
};

export function useAppData(): AppDataContextValue {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
}
