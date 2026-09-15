import { describe, it, expect } from 'vitest';
import {
  RoutineSharingService,
  SharedRoutine,
} from './RoutineSharingService';
import { Exercise, Routine } from '../domain';

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
        },
      ],
    },
  ],
};

const exercises: Exercise[] = [
  { id: 'ex_1', name: 'Bench Press', muscleGroup: 'Chest', logs: [] },
  { id: 'ex_2', name: 'Push Up', muscleGroup: 'Chest', logs: [] },
];

let sequence = 0;
const service = new RoutineSharingService(
  { generate: (prefix) => `${prefix}_${++sequence}` },
  { now: () => '2026-09-09T10:00:00.000Z', today: () => '2026-09-09' }
);

describe('RoutineSharingService', () => {
  it('serializes a routine with embedded exercise names and muscle groups', () => {
    const shared = service.create(baseRoutine, exercises);

    expect(shared.version).toBe(1);
    expect(shared.name).toBe('Upper Body');
    expect(shared.days[0].exercises[0]).toMatchObject({
      name: 'Bench Press',
      muscleGroup: 'Chest',
      sets: 3,
      reps: '8',
    });
  });

  it('round-trips through JSON', () => {
    const shared = service.create(baseRoutine, exercises);
    const json = service.serialize(shared);
    const parsed = service.parse(json);

    expect(parsed).toEqual(shared);
  });

  it('returns null for invalid JSON', () => {
    expect(service.parse('not json')).toBeNull();
  });

  it('returns null for routine missing required fields', () => {
    expect(service.parse(JSON.stringify({ name: 'Bad' }))).toBeNull();
  });

  it('omits stale routine references instead of exporting blank exercises', () => {
    const routine: Routine = {
      ...baseRoutine,
      days: [{
        ...baseRoutine.days[0],
        exercises: [
          ...baseRoutine.days[0].exercises,
          { exerciseId: 'missing', sets: 2, reps: '10', dropset: false, toFailure: false },
        ],
      }],
    };

    expect(service.create(routine, exercises).days[0].exercises).toHaveLength(1);
    expect(service.create(routine, exercises).days[0].exercises[0].name).toBe('Bench Press');
  });

  it('imports a routine reusing existing exercises by name and group', () => {
    const shared = service.create(baseRoutine, exercises);
    const result = service.import(shared, exercises);

    expect(result.createdExercises).toHaveLength(0);
    expect(result.routine.name).toBe('Upper Body');
    expect(result.routine.days[0].exercises[0].exerciseId).toBe('ex_1');
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

    const result = service.import(shared, []);

    expect(result.createdExercises).toHaveLength(1);
    expect(result.createdExercises[0].name).toBe('Squat');
    expect(result.createdExercises[0].muscleGroup).toBe('Legs');
    expect(result.routine.days[0].exercises[0].exerciseId).toBe(result.createdExercises[0].id);
  });

});
