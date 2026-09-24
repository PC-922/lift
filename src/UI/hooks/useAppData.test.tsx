import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApplicationServices } from '../ApplicationProvider';
import { ApplicationProvider } from '../ApplicationProvider';
import type { Exercise, Routine, Workout } from '../../domain';
import type { TrainingRepository, TrainingSnapshot } from '../../domain/TrainingRepository';
import { AppDataProvider, useAppData } from './useAppData';

const authState = vi.hoisted(() => ({
  current: { user: { uid: 'test-user' } as { uid: string } | null, localProfileId: 'local_test' },
}));

vi.mock('./useAuth', () => ({ useAuth: () => authState.current }));

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
    authentication: { signInWithGoogle: vi.fn(), signOut: vi.fn(), subscribe: vi.fn() },
    preferences: {
      getPrefs: () => ({ onboardingDone: false, language: null, defaultScreen: null, authMode: null, lastUid: null }),
      savePrefs: vi.fn(), getLanguage: () => null, setLanguage: vi.fn(), getDefaultScreen: () => null,
      setDefaultScreen: vi.fn(), isOnboardingDone: () => false, markOnboardingDone: vi.fn(),
      getLastUid: () => null, setLastUid: vi.fn(), getLocalProfileId: () => 'local_test', subscribe: () => () => undefined,
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
  beforeEach(() => {
    authState.current = { user: { uid: 'test-user' }, localProfileId: 'local_test' };
  });

  it('loads repository data and saves edits through a use case', async () => {
    const exercise: Exercise = { id: 'press', name: 'Press', muscleGroup: 'Chest', logs: [] };
    const repository = createRepository({ exercises: [exercise] });
    const { result } = renderHook(() => useAppData(), { wrapper: wrapperFor(repository) });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => result.current.updateExerciseNote('press', '  Slow descent  '));

    expect(repository.saveExercise).toHaveBeenCalledWith(expect.objectContaining({ id: 'press', note: 'Slow descent' }));
  });

  it('finishes a workout and records its last set', async () => {
    const exercise: Exercise = { id: 'press', name: 'Press', muscleGroup: 'Chest', logs: [] };
    const repository = createRepository({ exercises: [exercise] });
    const { result } = renderHook(() => useAppData(), { wrapper: wrapperFor(repository) });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const workout: Workout = {
      id: 'workout', name: 'Push', startedAt: 'start', finishedAt: 'finish',
      entries: [{ exerciseId: 'press', sets: [{ weight: 82, reps: 6 }, { weight: 70.5, reps: 10 }] }],
    };

    await act(async () => result.current.finishWorkout(workout));

    expect(repository.saveWorkout).toHaveBeenCalled();
    expect(repository.saveExercise).toHaveBeenCalledWith(expect.objectContaining({
      logs: [{ date: '2026-09-09', weight: 70.5, reps: 10 }],
    }));
  });

  it('saves an edited workout without rewriting exercise logs', async () => {
    const repository = createRepository();
    const { result } = renderHook(() => useAppData(), { wrapper: wrapperFor(repository) });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const workout = result.current.createWorkoutDraft();

    await act(async () => result.current.saveWorkout({ ...workout, name: 'Evening workout' }));

    expect(repository.saveWorkout).toHaveBeenCalledWith(expect.objectContaining({
      id: 'workout_id',
      name: 'Evening workout',
      updatedAt: '2026-09-09T10:00:00.000Z',
    }));
    expect(repository.saveExercise).not.toHaveBeenCalled();
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

  it('falls back to the cached snapshot when the data subscription stalls', () => {
    vi.useFakeTimers();
    const repository = createRepository({ muscleGroups: ['Cached'] });
    vi.mocked(repository.subscribe).mockImplementation(() => () => undefined);
    const { result, unmount } = renderHook(() => useAppData(), { wrapper: wrapperFor(repository) });

    act(() => vi.advanceTimersByTime(12000));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.muscleGroups).toEqual(['Cached']);
    unmount();
    vi.useRealTimers();
  });

  it('loads the device-local profile when Firebase auth is unavailable', async () => {
    authState.current = { user: null, localProfileId: 'local_test' };
    const repository = createRepository({ muscleGroups: ['Offline'] });
    const { result } = renderHook(() => useAppData(), { wrapper: wrapperFor(repository) });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(repository.subscribe).toHaveBeenCalled();
    expect(result.current.muscleGroups).toEqual(['Offline']);
  });
});
