import React, { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AddMuscleGroup } from '../../application/usecases/AddMuscleGroup';
import { DeleteExercise } from '../../application/usecases/DeleteExercise';
import { DeleteExerciseLog } from '../../application/usecases/DeleteExerciseLog';
import { DeleteExerciseLogs } from '../../application/usecases/DeleteExerciseLogs';
import { DeleteMuscleGroup } from '../../application/usecases/DeleteMuscleGroup';
import { DeleteRoutine } from '../../application/usecases/DeleteRoutine';
import { DeleteWorkout } from '../../application/usecases/DeleteWorkout';
import { ExportBackup } from '../../application/usecases/ExportBackup';
import { FinishWorkout } from '../../application/usecases/FinishWorkout';
import { ImportBackup } from '../../application/usecases/ImportBackup';
import { ImportRoutine } from '../../application/usecases/ImportRoutine';
import { KeepLatestExerciseLog } from '../../application/usecases/KeepLatestExerciseLog';
import { LogExerciseSession } from '../../application/usecases/LogExerciseSession';
import { RenameMuscleGroup } from '../../application/usecases/RenameMuscleGroup';
import { ReorderRoutineExercises } from '../../application/usecases/ReorderRoutineExercises';
import { ReorderRoutines } from '../../application/usecases/ReorderRoutines';
import { ResetTrainingData } from '../../application/usecases/ResetTrainingData';
import { SaveExercise } from '../../application/usecases/SaveExercise';
import { SaveRoutine } from '../../application/usecases/SaveRoutine';
import { SaveWorkout } from '../../application/usecases/SaveWorkout';
import { ShareRoutine } from '../../application/usecases/ShareRoutine';
import { UpdateExerciseDetails } from '../../application/usecases/UpdateExerciseDetails';
import { UpdateExerciseLog } from '../../application/usecases/UpdateExerciseLog';
import { UpdateExerciseNote } from '../../application/usecases/UpdateExerciseNote';
import { RoutineSharingService } from '../../application/RoutineSharingService';
import type { Exercise, ExerciseLog, Routine, Workout } from '../../domain';
import { workoutEditorService } from '../../domain/WorkoutEditorService';
import type { SyncStatus, TrainingRepository, TrainingSnapshot } from '../../domain/TrainingRepository';
import { useApplicationServices } from '../ApplicationProvider';
import { useAuth } from './useAuth';

interface AppDataContextValue extends TrainingSnapshot {
  isLoading: boolean;
  syncStatus: SyncStatus | null;
  error: string | null;
  saveExercise(exercise: Exercise): Promise<void>;
  deleteExercise(id: string): Promise<void>;
  updateExerciseDetails(id: string, name: string, muscleGroup: string): Promise<void>;
  updateExerciseNote(id: string, note: string): Promise<void>;
  updateExerciseLog(id: string, originalDate: string, log: ExerciseLog): Promise<void>;
  deleteExerciseLog(id: string, date: string): Promise<void>;
  deleteAllLogs(id: string): Promise<void>;
  deleteAllLogsExceptLatest(id: string): Promise<void>;
  logSession(id: string, weight: number | null, reps: number | null): Promise<void>;
  addMuscleGroup(group: string): Promise<void>;
  renameMuscleGroup(oldName: string, newName: string): Promise<void>;
  deleteMuscleGroup(group: string): Promise<void>;
  saveRoutine(routine: Routine): Promise<void>;
  deleteRoutine(id: string): Promise<void>;
  reorderRoutine(from: number, to: number): Promise<void>;
  reorderRoutineExercise(routineId: string, dayId: string, from: number, to: number): Promise<void>;
  deleteWorkout(id: string): Promise<void>;
  saveWorkout(workout: Workout): Promise<void>;
  createWorkoutDraft(): Workout;
  finishWorkout(workout: Workout): Promise<void>;
  exportData(): Promise<string>;
  importData(json: string): Promise<boolean>;
  shareRoutine(id: string): string | null;
  importRoutine(json: string): Promise<boolean>;
  resetData(): Promise<void>;
}

const emptySnapshot: TrainingSnapshot = {
  exercises: [], routines: [], muscleGroups: [], workouts: [],
};

const AppDataContext = createContext<AppDataContextValue | null>(null);
const DATA_RESOLVE_TIMEOUT_MS = 12000;

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user, fallbackUid } = useAuth();
  const { trainingRepository, clock, ids } = useApplicationServices();
  const [snapshot, setSnapshot] = useState(emptySnapshot);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const repositoryRef = useRef<TrainingRepository | null>(null);

  useEffect(() => {
    const uid = user?.uid ?? fallbackUid;
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    repositoryRef.current = null;
    setSnapshot(emptySnapshot);
    setSyncStatus(null);
    setError(null);
    setIsLoading(Boolean(uid));
    if (!uid) return;

    const connect = async () => {
      try {
        const repository = trainingRepository(uid);
        repositoryRef.current = repository;
        timeout = setTimeout(() => {
          if (disposed) return;
          setSnapshot(repository.getSnapshot());
          setIsLoading(false);
        }, DATA_RESOLVE_TIMEOUT_MS);
        unsubscribe = repository.subscribe(
          (next) => {
            if (!disposed) {
              if (timeout) clearTimeout(timeout);
              setSnapshot(next);
              setIsLoading(false);
            }
          },
          (status) => { if (!disposed) setSyncStatus(status); }
        );
      } catch (cause) {
        if (!disposed) {
          setError(cause instanceof Error ? cause.message : 'Unable to load data');
          setIsLoading(false);
        }
      }
    };

    void connect();
    return () => {
      disposed = true;
      if (timeout) clearTimeout(timeout);
      unsubscribe?.();
      repositoryRef.current = null;
    };
  }, [fallbackUid, trainingRepository, user?.uid]);

  const repository = () => repositoryRef.current;
  const routineSharing = () => new RoutineSharingService(ids, clock);

  const value: AppDataContextValue = {
    ...snapshot,
    isLoading,
    syncStatus,
    error,
    saveExercise: async (exercise) => { const current = repository(); if (current) await new SaveExercise(current, clock).execute(exercise); },
    deleteExercise: async (id) => { const current = repository(); if (current) await new DeleteExercise(current, clock).execute(id); },
    updateExerciseDetails: async (...args) => { const current = repository(); if (current) await new UpdateExerciseDetails(current, clock).execute(...args); },
    updateExerciseNote: async (...args) => { const current = repository(); if (current) await new UpdateExerciseNote(current, clock).execute(...args); },
    updateExerciseLog: async (...args) => { const current = repository(); if (current) await new UpdateExerciseLog(current, clock).execute(...args); },
    deleteExerciseLog: async (...args) => { const current = repository(); if (current) await new DeleteExerciseLog(current, clock).execute(...args); },
    deleteAllLogs: async (id) => { const current = repository(); if (current) await new DeleteExerciseLogs(current, clock).execute(id); },
    deleteAllLogsExceptLatest: async (id) => { const current = repository(); if (current) await new KeepLatestExerciseLog(current, clock).execute(id); },
    logSession: async (...args) => { const current = repository(); if (current) await new LogExerciseSession(current, clock).execute(...args); },
    addMuscleGroup: async (group) => { const current = repository(); if (current) await new AddMuscleGroup(current).execute(group); },
    renameMuscleGroup: async (...args) => { const current = repository(); if (current) await new RenameMuscleGroup(current, clock).execute(...args); },
    deleteMuscleGroup: async (group) => { const current = repository(); if (current) await new DeleteMuscleGroup(current, clock).execute(group); },
    saveRoutine: async (routine) => { const current = repository(); if (current) await new SaveRoutine(current, clock).execute(routine); },
    deleteRoutine: async (id) => { const current = repository(); if (current) await new DeleteRoutine(current).execute(id); },
    reorderRoutine: async (...args) => { const current = repository(); if (current) await new ReorderRoutines(current, clock).execute(...args); },
    reorderRoutineExercise: async (...args) => { const current = repository(); if (current) await new ReorderRoutineExercises(current, clock).execute(...args); },
    deleteWorkout: async (id) => { const current = repository(); if (current) await new DeleteWorkout(current).execute(id); },
    saveWorkout: async (workout) => { const current = repository(); if (current) await new SaveWorkout(current, clock).execute(workout); },
    createWorkoutDraft: () => workoutEditorService.create(ids.generate('workout'), clock.now()),
    finishWorkout: async (workout) => { const current = repository(); if (current) await new FinishWorkout(current, clock).execute(workout); },
    exportData: async () => { const current = repository(); return current ? new ExportBackup(current).execute() : ''; },
    importData: async (json) => { const current = repository(); return current ? new ImportBackup(current, clock).execute(json) : false; },
    shareRoutine: (id) => { const current = repository(); return current ? new ShareRoutine(current, routineSharing()).execute(id) : null; },
    importRoutine: async (json) => { const current = repository(); return current ? new ImportRoutine(current, routineSharing()).execute(json) : false; },
    resetData: async () => { const current = repository(); if (current) await new ResetTrainingData(current).execute(); },
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const context = useContext(AppDataContext);
  if (!context) throw new Error('useAppData must be used within an AppDataProvider');
  return context;
}
