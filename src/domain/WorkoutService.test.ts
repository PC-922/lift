import { describe, expect, it } from 'vitest';
import { workoutService } from './WorkoutService';

describe('workout session', () => {
  const initial = workoutService.start(
    { name: 'Push', exercises: [{ exerciseId: 'press', exerciseName: 'Bench Press' }] },
    'workout',
    '2026-09-08'
  );

  it('records sets and produces a completed workout without modifying the draft', () => {
    const draft = workoutService.recordSet(initial, 0, 40, 10)!;
    const expanded = workoutService.addExercise(draft, 'fly')!;
    expect(workoutService.finish(expanded, '2026-09-09').entries).toEqual([
      { exerciseId: 'press', exerciseName: 'Bench Press', sets: [{ weight: 40, reps: 10 }] },
    ]);
    expect(initial.exercises[0].sets).toEqual([]);
    expect(workoutService.replaceExercise(draft, 0, 'pullover')?.exercises[0].sets).toEqual([]);
    expect(workoutService.removeExercise(expanded, 1)?.exercises).toEqual(draft.exercises);
  });

  it('ignores empty sets, duplicate exercises and removal of the last exercise', () => {
    const expanded = workoutService.addExercise(initial, 'fly')!;

    expect(workoutService.recordSet(initial, 0, null, null)).toBe(initial);
    expect(workoutService.recordSet(null, 0, 10, 5)).toBeNull();
    expect(workoutService.addExercise(initial, 'press')).toBe(initial);
    expect(workoutService.removeExercise(initial, 0)).toBe(initial);
    expect(workoutService.recordSet(initial, 5, 10, 5)).toBe(initial);
    expect(workoutService.removeExercise(expanded, 5)).toBe(expanded);
  });

  it('does not replace an exercise with another one already in the workout', () => {
    const workout = workoutService.addExercise(initial, 'fly')!;

    expect(workoutService.replaceExercise(workout, 0, 'fly')).toBe(workout);
    expect(workoutService.replaceExercise(workout, 5, 'row')).toBe(workout);
  });

  it('selects the last recorded set instead of the best one', () => {
    expect(workoutService.lastRecordedSet({ exerciseId: 'ex', sets: [{ weight: 50, reps: 10 }, { weight: 45.5, reps: 8 }] }))
      .toEqual({ weight: 45.5, reps: 8 });
    expect(workoutService.lastRecordedSet({ exerciseId: 'ex', sets: [{ weight: 50, reps: 10 }, { weight: null, reps: null }] }))
      .toEqual({ weight: 50, reps: 10 });
  });

  it('snapshots current exercise names without erasing names for deleted exercises', () => {
    const workout = {
      id: 'workout',
      name: 'Upper',
      startedAt: '2026-09-15T10:00:00.000Z',
      finishedAt: '2026-09-15T11:00:00.000Z',
      entries: [
        { exerciseId: 'press', exerciseName: 'Old Press', sets: [] },
        { exerciseId: 'deleted', exerciseName: 'Pullover', sets: [] },
      ],
    };

    expect(workoutService.withExerciseNames(workout, new Map([['press', 'Bench Press']]))).toEqual({
      ...workout,
      entries: [
        { exerciseId: 'press', exerciseName: 'Bench Press', sets: [] },
        { exerciseId: 'deleted', exerciseName: 'Pullover', sets: [] },
      ],
    });
    expect(workoutService.withExerciseNames(workout, new Map())).toBeNull();
  });
});
