import { describe, expect, it, vi } from 'vitest';
import type { Exercise, Routine, Workout } from '../../domain';
import type { TrainingRepository, TrainingSnapshot } from '../../domain/TrainingRepository';
import { DeleteExercise } from './DeleteExercise';

function createRepository(snapshot: Partial<TrainingSnapshot>): TrainingRepository {
  const current: TrainingSnapshot = {
    exercises: [], routines: [], muscleGroups: [], workouts: [],
    ...snapshot,
  };
  return {
    getSnapshot: () => current,
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

const clock = {
  now: () => '2026-09-15T10:00:00.000Z',
  today: () => '2026-09-15',
};

describe('DeleteExercise', () => {
  it('removes routine references and preserves the exercise name in workout history', async () => {
    const exercises: Exercise[] = [
      { id: 'press', name: 'Bench Press', muscleGroup: 'Chest', logs: [] },
      { id: 'row', name: 'Row', muscleGroup: 'Back', logs: [] },
    ];
    const routine: Routine = {
      id: 'upper',
      name: 'Upper',
      days: [{
        id: 'day',
        name: 'Day',
        exercises: [
          { exerciseId: 'press', sets: 3, reps: '8', dropset: false, toFailure: false },
          { exerciseId: 'row', sets: 3, reps: '8', dropset: false, toFailure: false },
        ],
      }],
    };
    const workout: Workout = {
      id: 'workout',
      name: 'Upper',
      startedAt: '2026-09-14T10:00:00.000Z',
      finishedAt: '2026-09-14T11:00:00.000Z',
      entries: [{ exerciseId: 'press', sets: [{ weight: 50, reps: 8 }] }],
    };
    const repository = createRepository({ exercises, routines: [routine], workouts: [workout] });

    await new DeleteExercise(repository, clock).execute('press');

    expect(repository.saveRoutine).toHaveBeenCalledWith(expect.objectContaining({
      updatedAt: clock.now(),
      days: [expect.objectContaining({ exercises: [expect.objectContaining({ exerciseId: 'row' })] })],
    }));
    expect(repository.saveWorkout).toHaveBeenCalledWith(expect.objectContaining({
      updatedAt: clock.now(),
      entries: [expect.objectContaining({ exerciseId: 'press', exerciseName: 'Bench Press' })],
    }));
    expect(repository.deleteExercise).toHaveBeenCalledWith('press');
    expect(vi.mocked(repository.deleteExercise).mock.invocationCallOrder[0])
      .toBeGreaterThan(vi.mocked(repository.saveWorkout).mock.invocationCallOrder[0]);
  });

  it('does not delete the exercise when dependent data cannot be saved', async () => {
    const routine: Routine = {
      id: 'upper',
      name: 'Upper',
      days: [{
        id: 'day',
        name: 'Day',
        exercises: [{ exerciseId: 'press', sets: 3, reps: '8', dropset: false, toFailure: false }],
      }],
    };
    const repository = createRepository({ routines: [routine] });
    vi.mocked(repository.saveRoutine).mockRejectedValueOnce(new Error('write failed'));

    await expect(new DeleteExercise(repository, clock).execute('press')).rejects.toThrow('write failed');

    expect(repository.deleteExercise).not.toHaveBeenCalled();
  });
});
