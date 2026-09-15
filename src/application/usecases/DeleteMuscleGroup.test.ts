import { describe, expect, it, vi } from 'vitest';
import type { Exercise, Routine, Workout } from '../../domain';
import type { TrainingRepository, TrainingSnapshot } from '../../domain/TrainingRepository';
import { DeleteMuscleGroup } from './DeleteMuscleGroup';

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

describe('DeleteMuscleGroup', () => {
  it('removes the group, its exercises and their routine references', async () => {
    const exercises: Exercise[] = [
      { id: 'press', name: 'Press', muscleGroup: 'Chest', logs: [] },
      { id: 'row', name: 'Row', muscleGroup: 'Back', logs: [] },
    ];
    const routine: Routine = {
      id: 'upper', name: 'Upper',
      days: [{ id: 'day', name: 'Day', exercises: [
        { exerciseId: 'press', sets: 3, reps: '8', dropset: false, toFailure: false },
        { exerciseId: 'row', sets: 3, reps: '8', dropset: false, toFailure: false },
      ] }],
    };
    const workout: Workout = {
      id: 'workout', name: 'Upper',
      startedAt: '2026-09-08T10:00:00.000Z', finishedAt: '2026-09-08T11:00:00.000Z',
      entries: [{ exerciseId: 'press', sets: [{ weight: 50, reps: 8 }] }],
    };
    const repository = createRepository({ exercises, routines: [routine], muscleGroups: ['Chest', 'Back'], workouts: [workout] });

    await new DeleteMuscleGroup(repository, { now: () => '2026-09-09T10:00:00.000Z', today: () => '2026-09-09' }).execute('Chest');

    expect(repository.saveMuscleGroups).toHaveBeenCalledWith(['Back']);
    expect(repository.deleteExercise).toHaveBeenCalledWith('press');
    expect(repository.saveRoutine).toHaveBeenCalledWith(expect.objectContaining({
      days: [expect.objectContaining({ exercises: [expect.objectContaining({ exerciseId: 'row' })] })],
    }));
    expect(repository.saveWorkout).toHaveBeenCalledWith(expect.objectContaining({
      entries: [expect.objectContaining({ exerciseId: 'press', exerciseName: 'Press' })],
    }));
    expect(vi.mocked(repository.saveMuscleGroups).mock.invocationCallOrder[0])
      .toBeGreaterThan(vi.mocked(repository.deleteExercise).mock.invocationCallOrder[0]);
  });
});
