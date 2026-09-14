import { describe, expect, it } from 'vitest';
import { workoutService } from './WorkoutService';

describe('workout session', () => {
  const initial = workoutService.start(
    { name: 'Push', exercises: [{ exerciseId: 'press' }] },
    'workout',
    '2026-09-08'
  );

  it('records sets and produces a completed workout without modifying the draft', () => {
    const draft = workoutService.recordSet(initial, 0, 40, 10)!;
    const expanded = workoutService.addExercise(draft, 'fly')!;
    expect(workoutService.finish(expanded, '2026-09-09').entries).toEqual([
      { exerciseId: 'press', sets: [{ weight: 40, reps: 10 }] },
    ]);
    expect(initial.exercises[0].sets).toEqual([]);
    expect(workoutService.replaceExercise(draft, 0, 'fly')?.exercises[0].sets).toEqual([]);
    expect(workoutService.removeExercise(expanded, 1)?.exercises).toEqual(draft.exercises);
  });

  it('ignores empty sets, duplicate exercises and removal of the last exercise', () => {
    expect(workoutService.recordSet(initial, 0, null, null)).toBe(initial);
    expect(workoutService.recordSet(null, 0, 10, 5)).toBeNull();
    expect(workoutService.addExercise(initial, 'press')).toBe(initial);
    expect(workoutService.removeExercise(initial, 0)).toBe(initial);
  });

  it('selects the best recorded set and skips empty sets', () => {
    expect(workoutService.bestSet({ exerciseId: 'ex', sets: [{ weight: 50, reps: 8 }, { weight: 50, reps: 10 }] }))
      .toEqual({ weight: 50, reps: 10 });
    expect(workoutService.bestSet({ exerciseId: 'ex', sets: [{ weight: null, reps: null }] })).toBeNull();
  });
});
