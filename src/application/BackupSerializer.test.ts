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
        { blockId: 'routine-block-1', exerciseId: 'exercise_1', sets: 3, reps: '8', dropset: false, toFailure: false },
      ],
    },
  ],
};

const baseData = {
  exercises: [baseExercise],
  muscleGroups: ['Chest'],
  routines: [baseRoutine],
  workouts: [{
    id: 'workout_1',
    name: 'Upper Body',
    startedAt: '2026-01-02T10:00:00.000Z',
    finishedAt: '2026-01-02T11:00:00.000Z',
    entries: [{ blockId: 'workout-block-1', exerciseId: 'exercise_1', exerciseName: 'Bench Press', sets: [{ weight: 80, reps: 8 }] }],
  }],
};

describe('BackupSerializer', () => {
  it('exports data as the current backup format', () => {
    const result = serializeBackup(baseData);
    const parsed = JSON.parse(result);
    expect(parsed.exercises).toEqual([baseExercise]);
    expect(parsed.groups).toEqual(['Chest']);
    expect(parsed.routines).toEqual([baseRoutine]);
    expect(parsed.workouts).toEqual(baseData.workouts);
  });

  it('imports a full backup object', () => {
    const json = JSON.stringify({
      exercises: [baseExercise],
      groups: ['Chest'],
      routines: [baseRoutine],
      workouts: baseData.workouts,
    });
    const result = parseBackup(json);
    expect(result?.exercises).toHaveLength(1);
    expect(result?.muscleGroups).toEqual(['Chest']);
    expect(result?.routines).toHaveLength(1);
    expect(result?.workouts).toEqual(baseData.workouts);
  });

  it('keeps old backups compatible by defaulting workout history to empty', () => {
    const result = parseBackup(JSON.stringify({
      exercises: [baseExercise],
      groups: ['Chest'],
      routines: [baseRoutine],
    }));

    expect(result?.workouts).toEqual([]);
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

  it('repairs old backups by removing routine references to missing exercises', () => {
    const result = parseBackup(JSON.stringify({ exercises: [], groups: [], routines: [baseRoutine] }));

    expect(result?.routines[0].days[0].exercises).toEqual([]);
  });

  it('assigns stable distinct block IDs to legacy routine and workout occurrences', () => {
    const legacy = { exercises: [baseExercise], groups: ['Chest'], routines: [
      { ...baseRoutine, days: [{ ...baseRoutine.days[0], exercises: [
        (({ blockId: _blockId, ...exercise }) => exercise)(baseRoutine.days[0].exercises[0]),
        (({ blockId: _blockId, ...exercise }) => exercise)(baseRoutine.days[0].exercises[0]),
      ] }] },
    ], workouts: [{ ...baseData.workouts[0], entries: [
      (({ blockId: _blockId, ...entry }) => entry)(baseData.workouts[0].entries[0]),
      (({ blockId: _blockId, ...entry }) => entry)(baseData.workouts[0].entries[0]),
    ] }] };
    const json = JSON.stringify(legacy);
    const first = parseBackup(json)!;
    const second = parseBackup(json)!;
    const routineIds = first.routines[0].days[0].exercises.map((item) => item.blockId);
    const workoutIds = first.workouts[0].entries.map((item) => item.blockId);

    expect(new Set(routineIds).size).toBe(2);
    expect(new Set(workoutIds).size).toBe(2);
    expect(routineIds).toEqual(second.routines[0].days[0].exercises.map((item) => item.blockId));
    expect(workoutIds).toEqual(second.workouts[0].entries.map((item) => item.blockId));
  });
});
