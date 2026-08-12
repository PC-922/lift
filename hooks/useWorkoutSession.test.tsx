import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkoutSessionProvider, useWorkoutSession } from './useWorkoutSession';

const mockStorage: Record<string, string> = {};

vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => mockStorage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value; }),
  removeItem: vi.fn((key: string) => { delete mockStorage[key]; }),
  clear: vi.fn(() => { Object.keys(mockStorage).forEach((k) => delete mockStorage[k]); }),
  length: 0,
  key: vi.fn((index: number) => Object.keys(mockStorage)[index] ?? null),
});

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <WorkoutSessionProvider>{children}</WorkoutSessionProvider>
);

function startSession() {
  const { result } = renderHook(() => useWorkoutSession(), { wrapper });
  act(() => {
    result.current.startWorkout({
      name: 'Push Day',
      routineId: 'r1',
      dayId: 'd1',
      exercises: [
        { exerciseId: 'ex1', target: { sets: 3, reps: '10', restSeconds: 90 } },
        { exerciseId: 'ex2', target: { sets: 2, reps: '12' } },
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

  it('adds an exercise and ignores duplicates', () => {
    const result = startSession();

    act(() => {
      result.current.addExercise('ex3');
      result.current.addExercise('ex3');
    });

    expect(result.current.activeWorkout?.exercises.map((e) => e.exerciseId)).toEqual(['ex1', 'ex2', 'ex3']);
  });

  it('replaces the current exercise, clears sets and keeps its target', () => {
    const result = startSession();

    act(() => {
      result.current.logSet(80, 10);
      result.current.replaceCurrentExercise('ex2');
    });

    expect(result.current.activeWorkout?.exercises[0]).toEqual({
      exerciseId: 'ex2',
      sets: [],
      target: { sets: 3, reps: '10', restSeconds: 90 },
    });
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

    let workout: ReturnType<typeof result.current.finish> = null;
    act(() => {
      workout = result.current.finish();
    });

    expect(workout).not.toBeNull();
    expect(workout?.name).toBe('Push Day');
    expect(workout?.entries).toHaveLength(1);
    expect(workout?.entries[0]).toEqual({ exerciseId: 'ex1', sets: [{ weight: 80, reps: 10 }] });
    expect(workout?.finishedAt).toBeTruthy();
    expect(result.current.activeWorkout).toBeNull();
  });

  it('returns null when finishing without an active workout', () => {
    const { result } = renderHook(() => useWorkoutSession(), { wrapper });
    let workout: ReturnType<typeof result.current.finish> = { id: 'x', name: 'x', startedAt: '', finishedAt: '', entries: [] };
    act(() => {
      workout = result.current.finish();
    });
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
});
