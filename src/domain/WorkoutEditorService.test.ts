import { describe, expect, it } from 'vitest';
import type { Workout } from './Workout';
import { workoutEditorService } from './WorkoutEditorService';

const workout: Workout = {
  id: 'workout',
  name: 'Push',
  startedAt: '2026-09-14T10:00:00.000Z',
  finishedAt: '2026-09-14T11:00:00.000Z',
  entries: [{ exerciseId: 'press', sets: [{ weight: 80, reps: 8 }] }],
};

describe('WorkoutEditorService', () => {
  it('edits duration, exercises and sets without mutating the workout', () => {
    const withDuration = workoutEditorService.setDuration(workout, 90);
    const withExercise = workoutEditorService.addExercise(withDuration, 'fly');
    const withSet = workoutEditorService.addSet(withExercise, 1);
    const edited = workoutEditorService.updateSet(withSet, 1, 0, { weight: 12.5, reps: 12 });

    expect(edited.finishedAt).toBe('2026-09-14T11:30:00.000Z');
    expect(edited.entries[1]).toEqual(expect.objectContaining({
      exerciseId: 'fly',
      sets: [{ weight: 12.5, reps: 12 }],
    }));
    expect(workout.entries).toHaveLength(1);
  });

  it('allows repeated entries and keeps the replaced entry sets and block identity', () => {
    const repeated = workoutEditorService.addExercise(workout, 'press');
    const edited = workoutEditorService.replaceExercise(repeated, 1, 'press');

    expect(repeated.entries).toHaveLength(2);
    expect(repeated.entries[0].blockId).not.toBe(repeated.entries[1].blockId);
    expect(edited.entries[1]).toEqual(expect.objectContaining({
      blockId: repeated.entries[1].blockId,
      exerciseId: 'press',
      sets: [],
    }));
  });
});
