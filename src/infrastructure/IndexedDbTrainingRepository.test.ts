import { describe, expect, it } from 'vitest';
import type { TrainingSnapshot } from '../domain/TrainingRepository';
import {
  IndexedDbTrainingStoreError,
  createIndexedDbTrainingRepository,
  type IndexedDbDatabase,
} from './IndexedDbTrainingRepository';

const emptySnapshot = (): TrainingSnapshot => ({ exercises: [], routines: [], muscleGroups: [], workouts: [] });

class MemoryDatabase implements IndexedDbDatabase {
  private readonly records = new Map<string, TrainingSnapshot>();

  async read(profileId: string): Promise<TrainingSnapshot | undefined> {
    return this.records.get(profileId);
  }

  async write(profileId: string, snapshot: TrainingSnapshot): Promise<void> {
    this.records.set(profileId, structuredClone(snapshot));
  }
}

function exercise(id: string, order?: number) {
  return { id, name: id, muscleGroup: 'Chest', logs: [], order };
}

function routine(id: string) {
  return {
    id,
    name: id,
    days: [{ id: `${id}-day`, name: 'Day', exercises: [{ blockId: `${id}-block`, exerciseId: 'second', sets: 3, reps: '8', dropset: false, toFailure: false }] }],
  };
}

function workout(id: string) {
  return {
    id,
    name: id,
    startedAt: '2026-09-24T10:00:00.000Z',
    finishedAt: '2026-09-24T11:00:00.000Z',
    entries: [{ exerciseId: 'exercise', sets: [], blockId: `block-${id}` }],
  };
}

describe('createIndexedDbTrainingRepository', () => {
  it('persists transactional CRUD per profile and notifies snapshots', async () => {
    const database = new MemoryDatabase();
    const first = createIndexedDbTrainingRepository('profile-a', { database });
    const second = createIndexedDbTrainingRepository('profile-b', { database });
    const snapshots: TrainingSnapshot[] = [];
    const unsubscribe = first.subscribe((snapshot) => snapshots.push(snapshot), () => undefined);

    await first.saveExercise(exercise('first'));
    await first.saveExercise(exercise('second'));
    await first.deleteExercise('first');
    await first.saveMuscleGroups(['Chest']);
    await first.saveRoutine(routine('routine-a'));
    await first.saveWorkout(workout('workout-a'));
    await first.deleteRoutine('routine-a');
    await first.deleteWorkout('workout-a');

    expect(first.getSnapshot()).toEqual({
      exercises: [exercise('second', 1)],
      routines: [],
      muscleGroups: ['Chest'],
      workouts: [],
    });
    expect(second.getSnapshot()).toEqual(emptySnapshot());
    expect(snapshots.at(-1)).toEqual(first.getSnapshot());
    unsubscribe();
  });

  it('normalizes legacy blocks once during bootstrap without overwriting existing data', async () => {
    const database = new MemoryDatabase();
    const repository = createIndexedDbTrainingRepository('profile-a', { database });
    const legacy: TrainingSnapshot = {
      exercises: [exercise('legacy')],
      muscleGroups: ['Back'],
      routines: [{
        id: 'routine',
        name: 'Routine',
        days: [{ id: 'day', name: 'Day', exercises: [{ exerciseId: 'legacy', sets: 3, reps: '8', dropset: false, toFailure: false } as never] }],
      }],
      workouts: [],
    };

    await repository.bootstrapFromLegacySnapshot(legacy);
    expect(repository.getSnapshot().routines[0].days[0].exercises[0].blockId).toBeTruthy();

    await repository.saveExercise(exercise('current'));
    const bootstrap = await repository.bootstrapFromLegacySnapshot({ ...emptySnapshot(), exercises: [exercise('ignored')] });
    expect(bootstrap.exercises.map(({ id }) => id)).toEqual(['legacy', 'current']);
  });

  it('reports unavailable and quota failures explicitly', async () => {
    const unavailable = createIndexedDbTrainingRepository('profile-a', {
      database: {
        read: async () => { throw new DOMException('IndexedDB is unavailable', 'InvalidStateError'); },
        write: async () => undefined,
      },
    });
    await expect(unavailable.ready()).rejects.toMatchObject<Partial<IndexedDbTrainingStoreError>>({ code: 'unavailable' });

    const quota = createIndexedDbTrainingRepository('profile-a', {
      database: {
        read: async () => undefined,
        write: async () => { throw new DOMException('Quota exceeded', 'QuotaExceededError'); },
      },
    });
    await expect(quota.saveExercise(exercise('exercise'))).rejects.toMatchObject<Partial<IndexedDbTrainingStoreError>>({ code: 'quota' });
  });
});
