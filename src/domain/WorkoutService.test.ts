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
      expect.objectContaining({
        exerciseId: 'press',
        exerciseName: 'Bench Press',
        sets: [{ weight: 40, reps: 10 }],
      }),
    ]);
    expect(initial.exercises[0].sets).toEqual([]);
    expect(workoutService.replaceExercise(draft, 0, 'pullover')?.exercises[0].sets).toEqual([]);
    expect(workoutService.removeExercise(expanded, 1)?.exercises).toEqual(draft.exercises);
  });

  it('ignores empty sets and removal of the last exercise', () => {
    const expanded = workoutService.addExercise(initial, 'fly')!;

    expect(workoutService.recordSet(initial, 0, null, null)).toBe(initial);
    expect(workoutService.recordSet(null, 0, 10, 5)).toBeNull();
    expect(workoutService.removeExercise(initial, 0)).toBe(initial);
    expect(workoutService.recordSet(initial, 5, 10, 5)).toBe(initial);
    expect(workoutService.removeExercise(expanded, 5)).toBe(expanded);
  });

  it('removes and restores any recorded set without changing invalid drafts', () => {
    const recorded = workoutService.recordSet(
      workoutService.recordSet(
        workoutService.recordSet(initial, 0, 40, 10)!,
        0,
        45,
        8
      )!,
      0,
      50,
      6
    )!;

    const removed = workoutService.removeSet(recorded, 0, 1)!;
    expect(removed.exercises[0].sets).toEqual([
      { weight: 40, reps: 10 },
      { weight: 50, reps: 6 },
    ]);
    expect(workoutService.removeSet(recorded, 0, -1)).toBe(recorded);
    expect(workoutService.removeSet(recorded, 0, 3)).toBe(recorded);
    expect(workoutService.removeSet(recorded, 2, 0)).toBe(recorded);

    expect(workoutService.restoreSet(removed, 0, 1, { weight: 45, reps: 8 })?.exercises[0].sets)
      .toEqual([
        { weight: 40, reps: 10 },
        { weight: 45, reps: 8 },
        { weight: 50, reps: 6 },
      ]);
    expect(workoutService.restoreSet(removed, 0, -1, { weight: 45, reps: 8 })).toBe(removed);
    expect(workoutService.restoreSet(removed, 0, 3, { weight: 45, reps: 8 })).toBe(removed);
  });

  it('allows repeated exercise blocks and preserves the replaced block configuration', () => {
    const repeated = workoutService.addExercise(initial, 'press')!;
    const recorded = workoutService.recordSet(repeated, 0, 80, 8)!;

    expect(repeated.exercises).toHaveLength(2);
    expect(repeated.exercises[0].blockId).not.toBe(repeated.exercises[1].blockId);
    expect(workoutService.replaceExercise(recorded, 1, 'press', 'Bench Press')).toEqual(expect.objectContaining({
      exercises: [
        expect.objectContaining({ exerciseId: 'press', sets: [{ weight: 80, reps: 8 }] }),
        expect.objectContaining({
          blockId: repeated.exercises[1].blockId,
          exerciseId: 'press',
          exerciseName: 'Bench Press',
          sets: [],
        }),
      ],
    }));
    expect(workoutService.replaceExercise(recorded, 5, 'row')).toBe(recorded);
  });

  it('selects the last recorded set instead of the best one', () => {
    expect(workoutService.lastRecordedSet({ exerciseId: 'ex', sets: [{ weight: 50, reps: 10 }, { weight: 45.5, reps: 8 }] }))
      .toEqual({ weight: 45.5, reps: 8 });
    expect(workoutService.lastRecordedSet({ exerciseId: 'ex', sets: [{ weight: 50, reps: 10 }, { weight: null, reps: null }] }))
      .toEqual({ weight: 50, reps: 10 });
  });

  it('preserves a routine block ID through the active and completed workout', () => {
    const active = workoutService.start(
      { exercises: [{ blockId: 'routine-block-1', exerciseId: 'press' }] },
      'workout', '2026-09-08'
    );
    const recorded = workoutService.recordSet(active, 0, 80, 8)!;
    expect(recorded.exercises[0].blockId).toBe('routine-block-1');
    expect(workoutService.finish(recorded, '2026-09-09').entries[0].blockId).toBe('routine-block-1');
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
