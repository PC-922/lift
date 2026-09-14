import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ApplicationServices } from '../ApplicationProvider';
import { ApplicationProvider } from '../ApplicationProvider';
import type { Exercise, Routine, Workout } from '../../domain';
import type { TrainingRepository, TrainingSnapshot } from '../../domain/TrainingRepository';
import { AppDataProvider, useAppData } from './useAppData';

vi.mock('./useAuth', () => ({ useAuth: () => ({ user: { uid: 'test-user' } }) }));

const emptySnapshot: TrainingSnapshot = {
  exercises: [], routines: [], muscleGroups: [], workouts: [],
};

function createRepository(initial: Partial<TrainingSnapshot> = {}): TrainingRepository {
  let snapshot = { ...emptySnapshot, ...initial };
  let publish: ((value: TrainingSnapshot) => void) | null = null;
  return {
    getSnapshot: () => snapshot,
    subscribe: vi.fn((onData, onStatus) => {
      publish = onData;
      onData(snapshot);
      onStatus({ hasPendingWrites: false, fromCache: false });
      return () => { publish = null; };
    }),
    saveExercise: vi.fn(async (exercise: Exercise) => {
      snapshot = { ...snapshot, exercises: [...snapshot.exercises.filter((item) => item.id !== exercise.id), exercise] };
      publish?.(snapshot);
    }),
    deleteExercise: vi.fn(async () => undefined),
    saveRoutine: vi.fn(async (routine: Routine) => {
      snapshot = { ...snapshot, routines: [...snapshot.routines, routine] };
      publish?.(snapshot);
    }),
    deleteRoutine: vi.fn(async () => undefined),
    saveMuscleGroups: vi.fn(async (muscleGroups) => { snapshot = { ...snapshot, muscleGroups }; publish?.(snapshot); }),
    saveWorkout: vi.fn(async (workout: Workout) => { snapshot = { ...snapshot, workouts: [workout, ...snapshot.workouts] }; publish?.(snapshot); }),
    deleteWorkout: vi.fn(async () => undefined),
    resetData: vi.fn(async () => undefined),
  };
}

function createServices(repository: TrainingRepository): ApplicationServices {
  return {
    authentication: { signInWithGoogle: vi.fn(), continueAsGuest: vi.fn(), signOut: vi.fn(), subscribe: vi.fn() },
    preferences: {
      getPrefs: () => ({ onboardingDone: false, language: null, defaultScreen: null, authMode: null, lastUid: null }),
      savePrefs: vi.fn(), getLanguage: () => null, setLanguage: vi.fn(), getDefaultScreen: () => null,
      setDefaultScreen: vi.fn(), isOnboardingDone: () => false, markOnboardingDone: vi.fn(),
      getLastUid: () => null, setLastUid: vi.fn(), subscribe: () => () => undefined,
    },
    workoutDrafts: { load: () => null, save: vi.fn() },
    trainingRepository: () => repository,
    ids: { generate: (prefix) => `${prefix}_id` },
    clock: { now: () => '2026-09-09T10:00:00.000Z', today: () => '2026-09-09' },
  };
}

function wrapperFor(repository: TrainingRepository) {
  const services = createServices(repository);
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <ApplicationProvider services={services}><AppDataProvider>{children}</AppDataProvider></ApplicationProvider>;
  };
}

describe('useAppData', () => {
  it('loads repository data and saves edits through a use case', async () => {
    const exercise: Exercise = { id: 'press', name: 'Press', muscleGroup: 'Chest', logs: [] };
    const repository = createRepository({ exercises: [exercise] });
    const { result } = renderHook(() => useAppData(), { wrapper: wrapperFor(repository) });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => result.current.updateExerciseNote('press', '  Slow descent  '));

    expect(repository.saveExercise).toHaveBeenCalledWith(expect.objectContaining({ id: 'press', note: 'Slow descent' }));
  });

  it('finishes a workout and records its best set', async () => {
    const exercise: Exercise = { id: 'press', name: 'Press', muscleGroup: 'Chest', logs: [] };
    const repository = createRepository({ exercises: [exercise] });
    const { result } = renderHook(() => useAppData(), { wrapper: wrapperFor(repository) });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const workout: Workout = {
      id: 'workout', name: 'Push', startedAt: 'start', finishedAt: 'finish',
      entries: [{ exerciseId: 'press', sets: [{ weight: 80, reps: 8 }, { weight: 82, reps: 6 }] }],
    };

    await act(async () => result.current.finishWorkout(workout));

    expect(repository.saveWorkout).toHaveBeenCalled();
    expect(repository.saveExercise).toHaveBeenCalledWith(expect.objectContaining({
      logs: [{ date: '2026-09-09', weight: 82, reps: 6 }],
    }));
  });

  it('exposes repository subscription errors', async () => {
    const repository = createRepository();
    vi.mocked(repository.subscribe).mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    const { result } = renderHook(() => useAppData(), { wrapper: wrapperFor(repository) });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Storage unavailable');
    expect(repository.subscribe).toHaveBeenCalled();
  });
});
