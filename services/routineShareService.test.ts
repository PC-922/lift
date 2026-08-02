import { describe, it, expect } from 'vitest';
import {
  createSharedRoutine,
  importSharedRoutine,
  parseSharedRoutine,
  serializeSharedRoutine,
  SharedRoutine,
} from './routineShareService';
import { Exercise, Routine } from '../types';

const baseRoutine: Routine = {
  id: 'routine_1',
  name: 'Upper Body',
  days: [
    {
      id: 'day_1',
      name: 'Day A',
      exercises: [
        {
          exerciseId: 'ex_1',
          sets: 3,
          reps: '8',
          dropset: false,
          toFailure: false,
          alternativeExerciseId: 'ex_2',
        },
      ],
    },
  ],
};

const exercises: Exercise[] = [
  { id: 'ex_1', name: 'Bench Press', muscleGroup: 'Chest', logs: [] },
  { id: 'ex_2', name: 'Push Up', muscleGroup: 'Chest', logs: [] },
];

describe('routineShareService', () => {
  it('serializes a routine with embedded exercise names and muscle groups', () => {
    const shared = createSharedRoutine(baseRoutine, exercises);

    expect(shared.version).toBe(1);
    expect(shared.name).toBe('Upper Body');
    expect(shared.days[0].exercises[0]).toMatchObject({
      name: 'Bench Press',
      muscleGroup: 'Chest',
      sets: 3,
      reps: '8',
      alternativeName: 'Push Up',
      alternativeMuscleGroup: 'Chest',
    });
  });

  it('round-trips through JSON', () => {
    const shared = createSharedRoutine(baseRoutine, exercises);
    const json = serializeSharedRoutine(shared);
    const parsed = parseSharedRoutine(json);

    expect(parsed).toEqual(shared);
  });

  it('returns null for invalid JSON', () => {
    expect(parseSharedRoutine('not json')).toBeNull();
  });

  it('returns null for routine missing required fields', () => {
    expect(parseSharedRoutine(JSON.stringify({ name: 'Bad' }))).toBeNull();
  });

  it('imports a routine reusing existing exercises by name and group', () => {
    const shared = createSharedRoutine(baseRoutine, exercises);
    const result = importSharedRoutine(shared, exercises, ['Chest']);

    expect(result.createdExercises).toHaveLength(0);
    expect(result.routine.name).toBe('Upper Body');
    expect(result.routine.days[0].exercises[0].exerciseId).toBe('ex_1');
    expect(result.routine.days[0].exercises[0].alternativeExerciseId).toBe('ex_2');
  });

  it('creates missing exercises when importing', () => {
    const shared: SharedRoutine = {
      version: 1,
      name: 'Leg Day',
      days: [
        {
          name: 'Day A',
          exercises: [
            { name: 'Squat', muscleGroup: 'Legs', sets: 4, reps: '5', dropset: false, toFailure: false },
          ],
        },
      ],
    };

    const result = importSharedRoutine(shared, [], ['Chest']);

    expect(result.createdExercises).toHaveLength(1);
    expect(result.createdExercises[0].name).toBe('Squat');
    expect(result.createdExercises[0].muscleGroup).toBe('Legs');
    expect(result.routine.days[0].exercises[0].exerciseId).toBe(result.createdExercises[0].id);
  });

  it('maps alternatives to newly created exercises', () => {
    const shared: SharedRoutine = {
      version: 1,
      name: 'Push',
      days: [
        {
          name: 'Day A',
          exercises: [
            {
              name: 'Bench Press',
              muscleGroup: 'Chest',
              sets: 3,
              reps: '8',
              dropset: false,
              toFailure: false,
              alternativeName: 'Dumbbell Press',
              alternativeMuscleGroup: 'Chest',
            },
          ],
        },
      ],
    };

    const result = importSharedRoutine(shared, [], []);

    expect(result.createdExercises).toHaveLength(2);
    expect(result.routine.days[0].exercises[0].alternativeExerciseId).toBeDefined();
    expect(result.routine.days[0].exercises[0].alternativeExerciseId).not.toBe(
      result.routine.days[0].exercises[0].exerciseId
    );
  });
});
