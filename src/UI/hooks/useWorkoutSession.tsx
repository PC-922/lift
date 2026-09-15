import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Workout } from '../../domain';
import { workoutService } from '../../domain/WorkoutService';

import type { ActiveWorkout, WorkoutExerciseTarget, WorkoutStartOptions } from '../../domain/ActiveWorkout';
export type { ActiveWorkout, ActiveExercise, WorkoutExerciseTarget, WorkoutStartOptions } from '../../domain/ActiveWorkout';
import { useApplicationServices } from '../ApplicationProvider';

interface WorkoutSessionContextValue {
  activeWorkout: ActiveWorkout | null;
  currentIndex: number;
  startWorkout(options: WorkoutStartOptions): void;
  logSet(weight: number | null, reps: number | null): void;
  nextExercise(): void;
  prevExercise(): void;
  addExercise(exerciseId: string, target?: WorkoutExerciseTarget, exerciseName?: string): void;
  replaceCurrentExercise(exerciseId: string, exerciseName?: string): void;
  removeExercise(index: number): void;
  finish(): Workout | null;
  cancel(): void;
}

const WorkoutSessionContext = createContext<WorkoutSessionContextValue | null>(null);

interface WorkoutSessionProviderProps { children: ReactNode }

export const WorkoutSessionProvider: React.FC<WorkoutSessionProviderProps> = ({ children }) => {
  const { workoutDrafts, ids, clock } = useApplicationServices();
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setActiveWorkout(workoutDrafts.load());
    setHydrated(true);
  }, [workoutDrafts]);

  // Only persist once the draft has been loaded, so a restore on mount is
  // not clobbered by the initial empty state.
  useEffect(() => {
    if (!hydrated) return;
    workoutDrafts.save(activeWorkout);
  }, [activeWorkout, hydrated, workoutDrafts]);

  const startWorkout = useCallback((options: WorkoutStartOptions) => {
    setActiveWorkout(workoutService.start(options, ids.generate('workout'), clock.now()));
    setCurrentIndex(0);
  }, [clock, ids]);

  const logSet = useCallback((weight: number | null, reps: number | null) => {
    setActiveWorkout((previous) => workoutService.recordSet(previous, currentIndex, weight, reps));
  }, [currentIndex]);

  const nextExercise = useCallback(() => {
    if (!activeWorkout) return;
    setCurrentIndex((current) => Math.min(current + 1, activeWorkout.exercises.length - 1));
  }, [activeWorkout]);

  const prevExercise = useCallback(() => {
    setCurrentIndex((current) => Math.max(0, current - 1));
  }, []);

  const addExercise = useCallback((exerciseId: string, target?: WorkoutExerciseTarget, exerciseName?: string) => {
    setActiveWorkout((previous) => workoutService.addExercise(previous, exerciseId, target, exerciseName));
  }, []);

  const replaceCurrentExercise = useCallback((exerciseId: string, exerciseName?: string) => {
    setActiveWorkout((previous) => workoutService.replaceExercise(previous, currentIndex, exerciseId, exerciseName));
  }, [currentIndex]);

  const removeExercise = useCallback((index: number) => {
    if (!activeWorkout || activeWorkout.exercises.length <= 1) return;
    setActiveWorkout((previous) => workoutService.removeExercise(previous, index));
    setCurrentIndex((current) => Math.min(current, activeWorkout.exercises.length - 2));
  }, [activeWorkout]);

  const finish = useCallback((): Workout | null => {
    if (!activeWorkout) return null;
    const workout = workoutService.finish(activeWorkout, clock.now());
    setActiveWorkout(null);
    setCurrentIndex(0);
    return workout;
  }, [activeWorkout, clock]);

  const cancel = useCallback(() => {
    setActiveWorkout(null);
    setCurrentIndex(0);
  }, []);

  return (
    <WorkoutSessionContext.Provider
      value={{ activeWorkout, currentIndex, startWorkout, logSet, nextExercise, prevExercise, addExercise, replaceCurrentExercise, removeExercise, finish, cancel }}
    >
      {children}
    </WorkoutSessionContext.Provider>
  );
};

export function useWorkoutSession(): WorkoutSessionContextValue {
  const context = useContext(WorkoutSessionContext);
  if (!context) {
    throw new Error('useWorkoutSession must be used within a WorkoutSessionProvider');
  }
  return context;
}
