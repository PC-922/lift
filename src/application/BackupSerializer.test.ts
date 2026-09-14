import { describe, it, expect } from 'vitest';
import { serializeBackup, parseBackup } from './BackupSerializer';
import { Exercise, Routine } from '../domain';

const baseExercise: Exercise = {
  id: 'exercise_1',
  name: 'Bench Press',
  muscleGroup: 'Chest',
  logs: [{ date: '2026-01-01', weight: 80, reps: 8 }],
};

const baseRoutine: Routine = {
  id: 'routine_1',
  name: 'Upper Body',
  days: [
    {
      id: 'day_1',
      name: 'Day A',
      exercises: [
        { exerciseId: 'exercise_1', sets: 3, reps: '8', dropset: false, toFailure: false },
      ],
    },
  ],
};

const baseData = {
  exercises: [baseExercise],
  muscleGroups: ['Chest'],
  routines: [baseRoutine],
};

describe('BackupSerializer', () => {
  it('exports data as the current backup format', () => {
    const result = serializeBackup(baseData);
    const parsed = JSON.parse(result);
    expect(parsed.exercises).toEqual([baseExercise]);
    expect(parsed.groups).toEqual(['Chest']);
    expect(parsed.routines).toEqual([baseRoutine]);
  });

  it('imports a full backup object', () => {
    const json = JSON.stringify({
      exercises: [baseExercise],
      groups: ['Chest'],
      routines: [baseRoutine],
    });
    const result = parseBackup(json);
    expect(result?.exercises).toHaveLength(1);
    expect(result?.muscleGroups).toEqual(['Chest']);
    expect(result?.routines).toHaveLength(1);
  });

  it('rejects backups with an outdated routine format', () => {
    const routine = {
      ...baseRoutine,
      days: [
        {
          ...baseRoutine.days[0],
          exercises: [{ exerciseId: 'exercise_1', sets: 3, reps: 8, dropset: false, toFailure: false }],
        },
      ],
    };
    const json = JSON.stringify({ exercises: [], groups: [], routines: [routine] });
    const result = parseBackup(json);
    expect(result).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    expect(parseBackup('not json')).toBeNull();
  });
});
