import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Workout, WorkoutEntry, WorkoutSet } from '../types';
import { makeId } from '../services/storage/id';

const ACTIVE_WORKOUT_KEY = 'lift_active_workout_v1';

export interface WorkoutExerciseTarget {
  sets: number;
  reps: string;
  restSeconds?: number;
}

export interface ActiveExercise {
  exerciseId: string;
  sets: WorkoutSet[];
  target?: WorkoutExerciseTarget;
}

export interface ActiveWorkout {
  id: string;
  name: string;
  startedAt: string;
  routineId?: string;
  dayId?: string;
  exercises: ActiveExercise[];
}

export interface WorkoutStartOptions {
  name?: string;
  routineId?: string;
  dayId?: string;
  exercises: { exerciseId: string; target?: WorkoutExerciseTarget }[];
}

interface WorkoutSessionContextValue {
  activeWorkout: ActiveWorkout | null;
  currentIndex: number;
  startWorkout(options: WorkoutStartOptions): void;
  logSet(weight: number | null, reps: number | null): void;
  nextExercise(): void;
  prevExercise(): void;
  addExercise(exerciseId: string, target?: WorkoutExerciseTarget): void;
  removeExercise(index: number): void;
  finish(): Workout | null;
  cancel(): void;
}

const WorkoutSessionContext = createContext<WorkoutSessionContextValue | null>(null);

function loadDraft(): ActiveWorkout | null {
  try {
    const raw = localStorage.getItem(ACTIVE_WORKOUT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveWorkout;
    if (!parsed.id || !Array.isArray(parsed.exercises)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export const WorkoutSessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setActiveWorkout(loadDraft());
    setHydrated(true);
  }, []);

  // Only persist once the draft has been loaded, so a restore on mount is
  // not clobbered by the initial empty state.
  useEffect(() => {
    if (!hydrated) return;
    try {
      if (activeWorkout) {
        localStorage.setItem(ACTIVE_WORKOUT_KEY, JSON.stringify(activeWorkout));
      } else {
        localStorage.removeItem(ACTIVE_WORKOUT_KEY);
      }
    } catch {
      // storage unavailable — the session just won't survive a reload
    }
  }, [activeWorkout, hydrated]);

  const startWorkout = useCallback((options: WorkoutStartOptions) => {
    setActiveWorkout({
      id: makeId('workout'),
      name: options.name ?? '',
      startedAt: new Date().toISOString(),
      routineId: options.routineId,
      dayId: options.dayId,
      exercises: options.exercises.map(({ exerciseId, target }) => ({ exerciseId, sets: [], target })),
    });
    setCurrentIndex(0);
  }, []);

  const logSet = useCallback((weight: number | null, reps: number | null) => {
    if (weight === null && reps === null) return;
    setActiveWorkout((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((exercise, index) =>
          index === currentIndex
            ? { ...exercise, sets: [...exercise.sets, { weight, reps }] }
            : exercise
        ),
      };
    });
  }, [currentIndex]);

  const nextExercise = useCallback(() => {
    if (!activeWorkout) return;
    setCurrentIndex((current) => Math.min(current + 1, activeWorkout.exercises.length - 1));
  }, [activeWorkout]);

  const prevExercise = useCallback(() => {
    setCurrentIndex((current) => Math.max(0, current - 1));
  }, []);

  const addExercise = useCallback((exerciseId: string, target?: WorkoutExerciseTarget) => {
    setActiveWorkout((prev) => {
      if (!prev) return prev;
      if (prev.exercises.some((exercise) => exercise.exerciseId === exerciseId)) return prev;
      return {
        ...prev,
        exercises: [...prev.exercises, { exerciseId, sets: [], target }],
      };
    });
  }, []);

  const removeExercise = useCallback((index: number) => {
    if (!activeWorkout || activeWorkout.exercises.length <= 1) return;
    setActiveWorkout((prev) => {
      if (!prev) return prev;
      return { ...prev, exercises: prev.exercises.filter((_, i) => i !== index) };
    });
    setCurrentIndex((current) => Math.min(current, activeWorkout.exercises.length - 2));
  }, [activeWorkout]);

  const finish = useCallback((): Workout | null => {
    if (!activeWorkout) return null;
    const workout: Workout = {
      id: activeWorkout.id,
      name: activeWorkout.name,
      startedAt: activeWorkout.startedAt,
      finishedAt: new Date().toISOString(),
      routineId: activeWorkout.routineId,
      dayId: activeWorkout.dayId,
      entries: activeWorkout.exercises
        .map((exercise): WorkoutEntry => ({ exerciseId: exercise.exerciseId, sets: exercise.sets }))
        .filter((entry) => entry.sets.length > 0),
    };
    setActiveWorkout(null);
    setCurrentIndex(0);
    return workout;
  }, [activeWorkout]);

  const cancel = useCallback(() => {
    setActiveWorkout(null);
    setCurrentIndex(0);
  }, []);

  return (
    <WorkoutSessionContext.Provider
      value={{ activeWorkout, currentIndex, startWorkout, logSet, nextExercise, prevExercise, addExercise, removeExercise, finish, cancel }}
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
