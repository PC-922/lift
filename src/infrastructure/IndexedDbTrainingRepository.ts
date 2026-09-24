import type { Exercise, Routine, Workout } from '../domain';
import { normalizeRoutineBlocks, normalizeWorkoutBlocks } from '../domain/BlockId';
import type { SyncStatus, TrainingRepository, TrainingSnapshot } from '../domain/TrainingRepository';
import { getDefaultExercises, getDefaultMuscleGroups } from './seedData';

const DATABASE_NAME = 'lift-training';
const DATABASE_VERSION = 1;
const PROFILE_STORE = 'profiles';

export interface IndexedDbDatabase {
  read(profileId: string): Promise<TrainingSnapshot | undefined>;
  write(profileId: string, snapshot: TrainingSnapshot): Promise<void>;
}

export type IndexedDbTrainingStoreErrorCode = 'unavailable' | 'quota' | 'transaction';

export class IndexedDbTrainingStoreError extends Error {
  constructor(
    readonly code: IndexedDbTrainingStoreErrorCode,
    message: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = 'IndexedDbTrainingStoreError';
  }
}

export interface IndexedDbTrainingRepository extends TrainingRepository {
  ready(): Promise<void>;
  bootstrapFromLegacySnapshot(snapshot: TrainingSnapshot): Promise<TrainingSnapshot>;
}

export interface IndexedDbTrainingRepositoryOptions {
  readonly database?: IndexedDbDatabase;
}

interface StoredProfile {
  profileId: string;
  snapshot: TrainingSnapshot;
}

function emptySnapshot(): TrainingSnapshot {
  return { exercises: [], routines: [], muscleGroups: [], workouts: [] };
}

function copySnapshot(snapshot: TrainingSnapshot): TrainingSnapshot {
  return structuredClone(snapshot);
}

function normalizeSnapshot(snapshot: TrainingSnapshot): TrainingSnapshot {
  return {
    exercises: snapshot.exercises.map((exercise) => ({ ...exercise })),
    routines: snapshot.routines.map((routine) => normalizeRoutineBlocks(routine)),
    muscleGroups: [...snapshot.muscleGroups],
    workouts: snapshot.workouts.map((workout) => normalizeWorkoutBlocks(workout)),
  };
}

function isEmpty(snapshot: TrainingSnapshot): boolean {
  return snapshot.exercises.length === 0
    && snapshot.routines.length === 0
    && snapshot.muscleGroups.length === 0
    && snapshot.workouts.length === 0;
}

function storageError(error: unknown): IndexedDbTrainingStoreError {
  if (error instanceof IndexedDbTrainingStoreError) return error;
  const name = error instanceof DOMException ? error.name : undefined;
  if (name === 'QuotaExceededError') {
    return new IndexedDbTrainingStoreError('quota', 'Local storage quota was exceeded.', error);
  }
  if (name === 'InvalidStateError' || name === 'NotSupportedError' || name === 'SecurityError') {
    return new IndexedDbTrainingStoreError('unavailable', 'IndexedDB is unavailable in this browser.', error);
  }
  return new IndexedDbTrainingStoreError('transaction', 'The local training transaction failed.', error);
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result), { once: true });
    request.addEventListener('error', () => reject(request.error), { once: true });
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener('complete', () => resolve(), { once: true });
    transaction.addEventListener('abort', () => reject(transaction.error), { once: true });
    transaction.addEventListener('error', () => reject(transaction.error), { once: true });
  });
}

function openNativeDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(DATABASE_NAME, DATABASE_VERSION);
    request.addEventListener('upgradeneeded', () => {
      if (!request.result.objectStoreNames.contains(PROFILE_STORE)) {
        request.result.createObjectStore(PROFILE_STORE, { keyPath: 'profileId' });
      }
    });
    request.addEventListener('success', () => resolve(request.result), { once: true });
    request.addEventListener('error', () => reject(request.error), { once: true });
    request.addEventListener('blocked', () => reject(new DOMException('IndexedDB is blocked', 'InvalidStateError')), { once: true });
  });
}

export function createNativeIndexedDbDatabase(factory: IDBFactory | undefined = globalThis.indexedDB): IndexedDbDatabase {
  if (!factory) {
    return {
      read: async () => { throw new IndexedDbTrainingStoreError('unavailable', 'IndexedDB is unavailable in this browser.'); },
      write: async () => { throw new IndexedDbTrainingStoreError('unavailable', 'IndexedDB is unavailable in this browser.'); },
    };
  }

  const database = openNativeDatabase(factory);
  return {
    async read(profileId) {
      try {
        const db = await database;
        const transaction = db.transaction(PROFILE_STORE, 'readonly');
        const result = await requestResult(transaction.objectStore(PROFILE_STORE).get(profileId) as IDBRequest<StoredProfile | undefined>);
        await transactionComplete(transaction);
        return result?.snapshot;
      } catch (error) {
        throw storageError(error);
      }
    },
    async write(profileId, snapshot) {
      try {
        const db = await database;
        const transaction = db.transaction(PROFILE_STORE, 'readwrite');
        transaction.objectStore(PROFILE_STORE).put({ profileId, snapshot: copySnapshot(snapshot) } satisfies StoredProfile);
        await transactionComplete(transaction);
      } catch (error) {
        throw storageError(error);
      }
    },
  };
}

export function createIndexedDbTrainingRepository(
  profileId: string,
  options: IndexedDbTrainingRepositoryOptions = {}
): IndexedDbTrainingRepository {
  const database = options.database ?? createNativeIndexedDbDatabase();
  let snapshot = emptySnapshot();
  let loaded = false;
  let loadPromise: Promise<void> | undefined;
  const subscribers = new Set<(snapshot: TrainingSnapshot) => void>();
  const statuses = new Set<(status: SyncStatus) => void>();

  const notify = () => {
    const current = copySnapshot(snapshot);
    subscribers.forEach((subscriber) => subscriber(current));
    statuses.forEach((subscriber) => subscriber({ hasPendingWrites: false, fromCache: true }));
  };

  const load = () => {
    if (!loadPromise) {
      loadPromise = database.read(profileId)
        .then((stored) => {
          snapshot = normalizeSnapshot(stored ?? emptySnapshot());
          loaded = true;
          notify();
        })
        .catch((error) => { throw storageError(error); });
    }
    return loadPromise;
  };

  const mutate = async (change: (current: TrainingSnapshot) => TrainingSnapshot) => {
    await load();
    const next = normalizeSnapshot(change(copySnapshot(snapshot)));
    try {
      await database.write(profileId, next);
    } catch (error) {
      throw storageError(error);
    }
    snapshot = next;
    notify();
  };

  const nextOrder = (items: readonly { order?: number }[]) => Math.max(-1, ...items.map(({ order }) => order ?? -1)) + 1;

  return {
    getSnapshot: () => copySnapshot(snapshot),
    ready: load,
    subscribe(onData, onStatus) {
      subscribers.add(onData);
      statuses.add(onStatus);
      onData(copySnapshot(snapshot));
      onStatus({ hasPendingWrites: false, fromCache: true });
      void load().catch(() => undefined);
      return () => {
        subscribers.delete(onData);
        statuses.delete(onStatus);
      };
    },
    async bootstrapFromLegacySnapshot(legacy) {
      await load();
      if (isEmpty(snapshot)) {
        await mutate(() => normalizeSnapshot(legacy));
      }
      return copySnapshot(snapshot);
    },
    saveExercise(exercise: Exercise) {
      return mutate((current) => {
        const existing = current.exercises.findIndex(({ id }) => id === exercise.id);
        const next = { ...exercise, order: exercise.order ?? (existing === -1 ? nextOrder(current.exercises) : current.exercises[existing].order) };
        return {
          ...current,
          exercises: existing === -1
            ? [...current.exercises, next]
            : current.exercises.map((item, index) => index === existing ? next : item),
        };
      });
    },
    deleteExercise(id) {
      return mutate((current) => ({ ...current, exercises: current.exercises.filter((exercise) => exercise.id !== id) }));
    },
    saveRoutine(routine: Routine) {
      return mutate((current) => {
        const existing = current.routines.findIndex(({ id }) => id === routine.id);
        const next = { ...routine, order: routine.order ?? (existing === -1 ? nextOrder(current.routines) : current.routines[existing].order) };
        return {
          ...current,
          routines: existing === -1
            ? [...current.routines, next]
            : current.routines.map((item, index) => index === existing ? next : item),
        };
      });
    },
    deleteRoutine(id) {
      return mutate((current) => ({ ...current, routines: current.routines.filter((routine) => routine.id !== id) }));
    },
    saveMuscleGroups(muscleGroups) {
      return mutate((current) => ({ ...current, muscleGroups: [...muscleGroups] }));
    },
    saveWorkout(workout: Workout) {
      return mutate((current) => {
        const existing = current.workouts.findIndex(({ id }) => id === workout.id);
        return {
          ...current,
          workouts: existing === -1
            ? [...current.workouts, workout]
            : current.workouts.map((item, index) => index === existing ? workout : item),
        };
      });
    },
    deleteWorkout(id) {
      return mutate((current) => ({ ...current, workouts: current.workouts.filter((workout) => workout.id !== id) }));
    },
    resetData() {
      return mutate(() => ({
        exercises: getDefaultExercises().map((exercise, order) => ({ ...exercise, order })),
        routines: [],
        muscleGroups: getDefaultMuscleGroups(),
        workouts: [],
      }));
    },
  };
}
