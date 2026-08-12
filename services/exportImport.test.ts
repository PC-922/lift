import { describe, it, expect } from 'vitest';
import { exportData, importData } from './exportImport';
import { Exercise, GroupSortPreference, Routine } from '../types';

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

const sortPreference: GroupSortPreference = { field: 'weight', direction: 'asc' };

const baseData = {
  exercises: [baseExercise],
  muscleGroups: ['Chest'],
  routines: [baseRoutine],
  sortPreference,
};

describe('exportImport', () => {
  it('exports data as a JSON string with legacy shape', () => {
    const result = exportData(baseData);
    const parsed = JSON.parse(result);
    expect(parsed.exercises).toEqual([baseExercise]);
    expect(parsed.groups).toEqual(['Chest']);
    expect(parsed.routines).toEqual([baseRoutine]);
    expect(parsed.sortPreference).toEqual(sortPreference);
  });

  it('imports a legacy array of exercises', () => {
    const json = JSON.stringify([baseExercise]);
    const result = importData(json);
    expect(result).not.toBeNull();
    expect(result?.exercises).toHaveLength(1);
    expect(result?.muscleGroups).toEqual([]);
    expect(result?.routines).toEqual([]);
  });

  it('imports a full backup object', () => {
    const json = JSON.stringify({
      exercises: [baseExercise],
      groups: ['Chest'],
      routines: [baseRoutine],
      sortPreference,
    });
    const result = importData(json);
    expect(result?.exercises).toHaveLength(1);
    expect(result?.muscleGroups).toEqual(['Chest']);
    expect(result?.routines).toHaveLength(1);
    expect(result?.sortPreference).toEqual(sortPreference);
  });

  it('normalizes numeric reps to strings during import', () => {
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
    const result = importData(json);
    expect(result?.routines[0].days[0].exercises[0].reps).toBe('8');
  });

  it('removes legacy alternative fields during import', () => {
    const json = JSON.stringify({
      exercises: [],
      groups: [],
      routines: [{
        ...baseRoutine,
        days: [{
          ...baseRoutine.days[0],
          exercises: [{
            ...baseRoutine.days[0].exercises[0],
            alternativeExerciseId: 'exercise_legacy',
          }],
        }],
      }],
    });

    const result = importData(json);

    expect(result?.routines[0].days[0].exercises[0]).not.toHaveProperty('alternativeExerciseId');
  });

  it('falls back to default sort preference when invalid', () => {
    const json = JSON.stringify({ exercises: [], groups: [], routines: [], sortPreference: { field: 'invalid', direction: 'asc' } });
    const result = importData(json);
    expect(result?.sortPreference).toEqual({ field: 'progress', direction: 'desc' });
  });

  it('returns null for invalid JSON', () => {
    expect(importData('not json')).toBeNull();
  });
});
