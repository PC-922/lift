import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkoutSessionProvider, useWorkoutSession } from './useWorkoutSession';
import { ApplicationProvider, type ApplicationServices } from '../ApplicationProvider';
import { localStorageWorkoutDraftRepository } from '../../infrastructure/LocalStorageWorkoutDraftRepository';

const mockStorage: Record<string, string> = {};

vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => mockStorage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value; }),
  removeItem: vi.fn((key: string) => { delete mockStorage[key]; }),
  clear: vi.fn(() => { Object.keys(mockStorage).forEach((k) => delete mockStorage[k]); }),
  length: 0,
  key: vi.fn((index: number) => Object.keys(mockStorage)[index] ?? null),
});

const services = {
  authentication: { signInWithGoogle: vi.fn(), signOut: vi.fn(), subscribe: vi.fn() },
  preferences: {
    getPrefs: () => ({ onboardingDone: false, language: null, defaultScreen: null, authMode: null, lastUid: null }),
    savePrefs: vi.fn(), getLanguage: () => null, setLanguage: vi.fn(), getDefaultScreen: () => null,
    setDefaultScreen: vi.fn(), isOnboardingDone: () => false, markOnboardingDone: vi.fn(),
    getLastUid: () => null, setLastUid: vi.fn(), getLocalProfileId: () => 'local_test', subscribe: () => () => undefined,
  },
  workoutDrafts: localStorageWorkoutDraftRepository,
  trainingRepository: vi.fn(),
  ids: { generate: (prefix: string) => `${prefix}_id` },
  clock: { now: () => '2026-09-09T10:00:00.000Z', today: () => '2026-09-09' },
} satisfies ApplicationServices;

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ApplicationProvider services={services}>
    <WorkoutSessionProvider>{children}</WorkoutSessionProvider>
  </ApplicationProvider>
);

function startSession() {
  const { result } = renderHook(() => useWorkoutSession(), { wrapper });
  act(() => {
    result.current.startWorkout({
      name: 'Push Day',
      routineId: 'r1',
      dayId: 'd1',
      exercises: [
        { exerciseId: 'ex1', exerciseName: 'Bench Press', target: { sets: 3, reps: '10', restSeconds: 90 } },
        { exerciseId: 'ex2', exerciseName: 'Incline Press', target: { sets: 2, reps: '12' } },
      ],
    });
  });
  return result;
}

describe('useWorkoutSession', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts a workout with ordered exercises and targets', () => {
    const result = startSession();

    expect(result.current.activeWorkout).not.toBeNull();
    expect(result.current.activeWorkout?.name).toBe('Push Day');
    expect(result.current.activeWorkout?.routineId).toBe('r1');
    expect(result.current.activeWorkout?.exercises).toHaveLength(2);
    expect(result.current.activeWorkout?.exercises[0].target).toEqual({ sets: 3, reps: '10', restSeconds: 90 });
    expect(result.current.currentIndex).toBe(0);
  });

  it('logs a set into the current exercise', () => {
    const result = startSession();

    act(() => {
      result.current.logSet(80, 10);
      result.current.logSet(82, 8);
    });

    expect(result.current.activeWorkout?.exercises[0].sets).toEqual([
      { weight: 80, reps: 10 },
      { weight: 82, reps: 8 },
    ]);
    expect(result.current.activeWorkout?.exercises[1].sets).toEqual([]);
  });

  it('ignores a set with both weight and reps empty', () => {
    const result = startSession();

    act(() => {
      result.current.logSet(null, null);
    });

    expect(result.current.activeWorkout?.exercises[0].sets).toEqual([]);
  });

  it('removes a middle set, persists the draft, and restores it at the same position', () => {
    const result = startSession();

    act(() => {
      result.current.logSet(80, 10);
      result.current.logSet(82, 8);
      result.current.logSet(84, 6);
      result.current.removeSet(0, 1);
    });

    expect(result.current.activeWorkout?.exercises[0].sets).toEqual([
      { weight: 80, reps: 10 },
      { weight: 84, reps: 6 },
    ]);
    expect(JSON.parse(localStorage.getItem('lift_active_workout_v1') ?? '')).toEqual(expect.objectContaining({
      exercises: expect.arrayContaining([
        expect.objectContaining({ sets: [{ weight: 80, reps: 10 }, { weight: 84, reps: 6 }] }),
      ]),
    }));

    act(() => result.current.restoreSet(0, 1, { weight: 82, reps: 8 }));

    expect(result.current.activeWorkout?.exercises[0].sets).toEqual([
      { weight: 80, reps: 10 },
      { weight: 82, reps: 8 },
      { weight: 84, reps: 6 },
    ]);
  });

  it('ignores invalid current set indexes', () => {
    const result = startSession();

    act(() => {
      result.current.logSet(80, 10);
      result.current.removeSet(0, -1);
      result.current.removeSet(0, 1);
    });

    expect(result.current.activeWorkout?.exercises[0].sets).toEqual([{ weight: 80, reps: 10 }]);
  });

  it('navigates between exercises with clamping', () => {
    const result = startSession();

    act(() => result.current.nextExercise());
    expect(result.current.currentIndex).toBe(1);

    act(() => result.current.nextExercise());
    expect(result.current.currentIndex).toBe(1);

    act(() => result.current.prevExercise());
    expect(result.current.currentIndex).toBe(0);

    act(() => result.current.prevExercise());
    expect(result.current.currentIndex).toBe(0);
  });

  it('adds repeated exercises as independent blocks', () => {
    const result = startSession();

    act(() => {
      result.current.addExercise('ex3');
      result.current.addExercise('ex3');
    });

    expect(result.current.activeWorkout?.exercises.map((e) => e.exerciseId)).toEqual(['ex1', 'ex2', 'ex3', 'ex3']);
    const repeated = result.current.activeWorkout?.exercises.slice(-2) ?? [];
    expect(repeated[0].blockId).not.toBe(repeated[1].blockId);
  });

  it('replaces the current exercise, clears sets and keeps its target', () => {
    const result = startSession();
    const blockId = result.current.activeWorkout?.exercises[0].blockId;

    act(() => {
      result.current.logSet(80, 10);
      result.current.replaceCurrentExercise('ex3', 'Cable Fly');
    });

    expect(result.current.activeWorkout?.exercises[0]).toEqual(expect.objectContaining({
      exerciseId: 'ex3',
      blockId,
      exerciseName: 'Cable Fly',
      sets: [],
      target: { sets: 3, reps: '10', restSeconds: 90 },
    }));
  });

  it('removes an exercise and clamps the index', () => {
    const result = startSession();

    act(() => result.current.nextExercise());
    act(() => result.current.removeExercise(0));

    expect(result.current.activeWorkout?.exercises.map((e) => e.exerciseId)).toEqual(['ex2']);
    expect(result.current.currentIndex).toBe(0);
  });

  it('does not remove the last exercise', () => {
    const { result } = renderHook(() => useWorkoutSession(), { wrapper });

    act(() => {
      result.current.startWorkout({ name: 'Solo', exercises: [{ exerciseId: 'ex1' }] });
      result.current.removeExercise(0);
    });

    expect(result.current.activeWorkout?.exercises).toHaveLength(1);
  });

  it('finishes a workout keeping only entries with recorded sets', () => {
    const result = startSession();

    act(() => {
      result.current.logSet(80, 10);
      result.current.nextExercise();
    });

    const finished: { workout: ReturnType<typeof result.current.finish> } = { workout: null };
    act(() => {
      finished.workout = result.current.finish();
    });

    const workout = finished.workout;
    expect(workout).not.toBeNull();
    expect(workout?.name).toBe('Push Day');
    expect(workout?.entries).toHaveLength(1);
    expect(workout?.entries[0]).toEqual(expect.objectContaining({
      exerciseId: 'ex1',
      exerciseName: 'Bench Press',
      sets: [{ weight: 80, reps: 10 }],
    }));
    expect(workout?.finishedAt).toBeTruthy();
    expect(result.current.activeWorkout).toBeNull();
  });

  it('returns null when finishing without an active workout', () => {
    const { result } = renderHook(() => useWorkoutSession(), { wrapper });
    const finished: { workout: ReturnType<typeof result.current.finish> } = { workout: null };
    act(() => {
      finished.workout = result.current.finish();
    });
    const workout = finished.workout;
    expect(workout).toBeNull();
  });

  it('cancels and clears the active workout', () => {
    const result = startSession();

    act(() => result.current.cancel());

    expect(result.current.activeWorkout).toBeNull();
  });

  it('restores a draft from localStorage on mount', () => {
    const first = startSession();
    const persisted = localStorage.getItem('lift_active_workout_v1');
    expect(persisted).toBeTruthy();

    const { result: second } = renderHook(() => useWorkoutSession(), { wrapper });
    expect(second.current.activeWorkout?.id).toBe(first.current.activeWorkout?.id);
    expect(second.current.activeWorkout?.exercises).toHaveLength(2);
  });

  it('restores recorded sets from an unfinished draft after a reload', () => {
    const first = startSession();
    act(() => first.current.logSet(80, 10));

    const { result: second } = renderHook(() => useWorkoutSession(), { wrapper });

    expect(second.current.activeWorkout?.id).toBe(first.current.activeWorkout?.id);
    expect(second.current.activeWorkout?.exercises[0]?.sets).toEqual([{ weight: 80, reps: 10 }]);
  });
});
