import { describe, expect, it, vi } from 'vitest';
import type { TrainingRepository, TrainingSnapshot } from '../../domain/TrainingRepository';
import { ImportBackup } from './ImportBackup';

function createRepository(): TrainingRepository {
  const snapshot: TrainingSnapshot = {
    exercises: [], routines: [], muscleGroups: [], workouts: [],
  };
  return {
    getSnapshot: () => snapshot,
    subscribe: vi.fn(() => () => undefined),
    saveExercise: vi.fn(async () => undefined),
    deleteExercise: vi.fn(async () => undefined),
    saveRoutine: vi.fn(async () => undefined),
    deleteRoutine: vi.fn(async () => undefined),
    saveMuscleGroups: vi.fn(async () => undefined),
    saveWorkout: vi.fn(async () => undefined),
    deleteWorkout: vi.fn(async () => undefined),
    resetData: vi.fn(async () => undefined),
  };
}

describe('ImportBackup', () => {
  it('rejects malformed data without changing the repository', async () => {
    const repository = createRepository();

    const imported = await new ImportBackup(repository, {
      now: () => '2026-09-09T10:00:00.000Z',
      today: () => '2026-09-09',
    }).execute('{invalid');

    expect(imported).toBe(false);
    expect(repository.saveExercise).not.toHaveBeenCalled();
    expect(repository.saveRoutine).not.toHaveBeenCalled();
  });

  it('imports workout history together with exercises and routines', async () => {
    const repository = createRepository();
    const workout = {
      id: 'workout',
      name: 'Upper',
      startedAt: '2026-09-08T10:00:00.000Z',
      finishedAt: '2026-09-08T11:00:00.000Z',
      entries: [{ exerciseId: 'press', exerciseName: 'Press', sets: [{ weight: 50, reps: 8 }] }],
    };
    const imported = await new ImportBackup(repository, {
      now: () => '2026-09-09T10:00:00.000Z',
      today: () => '2026-09-09',
    }).execute(JSON.stringify({
      exercises: [{ id: 'press', name: 'Press', muscleGroup: 'Chest', logs: [] }],
      groups: ['Chest'],
      routines: [],
      workouts: [workout],
    }));

    expect(imported).toBe(true);
    expect(repository.saveWorkout).toHaveBeenCalledWith(expect.objectContaining({
      ...workout,
      entries: [expect.objectContaining(workout.entries[0])],
      updatedAt: '2026-09-09T10:00:00.000Z',
    }));
  });
});
