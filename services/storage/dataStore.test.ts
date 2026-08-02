import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFirestoreDataStore, DataStore, DataStoreSnapshot, DataStoreStatus } from './dataStore';
import { Exercise, GroupSortPreference, Routine } from '../../types';

interface FakeDoc {
  id: string;
  data: Record<string, unknown>;
  ref: { path: string };
}

interface FakeCollection {
  docs: FakeDoc[];
}

function createFakeFirestore() {
  const collections = new Map<string, FakeCollection>();
  const docs = new Map<string, Record<string, unknown>>();
  const listeners = new Set<() => void>();

  function getPath(input: unknown, segments: string[]): string {
    if (input && typeof input === 'object' && 'path' in input && typeof input.path === 'string') {
      const base = input.path;
      return segments.length === 0 ? base : `${base}/${segments.join('/')}`;
    }
    return segments.join('/');
  }

  function getCollection(path: string): FakeCollection {
    if (!collections.has(path)) {
      collections.set(path, { docs: [] });
    }
    return collections.get(path)!;
  }

  function setDocData(path: string, data: Record<string, unknown>, merge: boolean) {
    const existing = docs.get(path) ?? {};
    const next = merge ? { ...existing, ...data } : { ...data };
    docs.set(path, next);

    const segments = path.split('/');
    const collectionPathValue = segments.slice(0, -1).join('/');
    const id = segments[segments.length - 1];
    const collection = getCollection(collectionPathValue);
    const existingIndex = collection.docs.findIndex((d) => d.id === id);
    const docEntry: FakeDoc = { id, data: next, ref: { path } };
    if (existingIndex >= 0) {
      collection.docs[existingIndex] = docEntry;
    } else {
      collection.docs.push(docEntry);
    }

    listeners.forEach((notify) => notify());
  }

  function deleteDocData(path: string) {
    docs.delete(path);
    const segments = path.split('/');
    const collectionPathValue = segments.slice(0, -1).join('/');
    const id = segments[segments.length - 1];
    const collection = getCollection(collectionPathValue);
    collection.docs = collection.docs.filter((d) => d.id !== id);
    listeners.forEach((notify) => notify());
  }

  function snapshotMetadata() {
    return { hasPendingWrites: false, fromCache: true };
  }

  return {
    collections,
    docs,
    listeners,
    getPath,
    setDocData,
    deleteDocData,
    snapshotMetadata,
  };
}

function buildMockFirestore(fake: ReturnType<typeof createFakeFirestore>) {
  return {
    collection: vi.fn((_dbOrRef: unknown, ...pathSegments: string[]) => {
      const path = fake.getPath(_dbOrRef, pathSegments);
      return { path };
    }),

    doc: vi.fn((_dbOrRef: unknown, ...pathSegments: string[]) => {
      const path = fake.getPath(_dbOrRef, pathSegments);
      return { path };
    }),

    setDoc: vi.fn(async (docRef: { path: string }, data: Record<string, unknown>, options?: { merge?: boolean }) => {
      fake.setDocData(docRef.path, data, options?.merge ?? false);
    }),

    deleteDoc: vi.fn(async (docRef: { path: string }) => {
      fake.deleteDocData(docRef.path);
    }),

    getDocs: vi.fn(async (collectionRef: { path: string }) => {
      const collection = fake.collections.get(collectionRef.path) ?? { docs: [] };
      return {
        size: collection.docs.length,
        docs: collection.docs.map((d) => ({
          id: d.id,
          ref: d.ref,
          data: () => d.data,
        })),
        empty: collection.docs.length === 0,
      };
    }),

    getDoc: vi.fn(async (docRef: { path: string }) => {
      const data = fake.docs.get(docRef.path);
      return {
        exists: () => data !== undefined,
        data: () => data,
      };
    }),

    onSnapshot: vi.fn(
      (
        target: { path: string } | (() => unknown),
        onNext: (snapshot: unknown) => void,
        _onError?: (error: unknown) => void
      ) => {
        const notify = () => {
          if (typeof target === 'function') {
            const snapshot = target();
            onNext(snapshot);
            return;
          }

          const path = target.path;
          const isCollection = path.split('/').length % 2 === 1;
          if (isCollection) {
            const collection = fake.collections.get(path) ?? { docs: [] };
            onNext({
              docs: collection.docs.map((d) => ({
                id: d.id,
                data: () => d.data,
              })),
              metadata: fake.snapshotMetadata(),
            });
            return;
          }

          const data = fake.docs.get(path);
          onNext({
            data: () => data,
            metadata: fake.snapshotMetadata(),
          });
        };

        fake.listeners.add(notify);
        notify();

        return () => {
          fake.listeners.delete(notify);
        };
      }
    ),

    query: vi.fn((collectionRef: unknown, ..._constraints: unknown[]) => collectionRef),

    orderBy: vi.fn((_field: string, _direction?: string) => ({ type: 'orderBy' })),

    writeBatch: vi.fn((_db: unknown) => {
      const deletes: string[] = [];
      return {
        delete: (docRef: { path: string }) => {
          deletes.push(docRef.path);
        },
        commit: async () => {
          deletes.forEach((path) => fake.deleteDocData(path));
        },
      };
    }),
  };
}

const mockFirestore = createFakeFirestore();
const mockExports = buildMockFirestore(mockFirestore);

vi.mock('firebase/firestore', () => ({
  ...mockExports,
  Timestamp: {
    fromDate: (date: Date) => ({ toDate: () => date }),
  },
}));

describe('createFirestoreDataStore', () => {
  let dataStore: DataStore;

  beforeEach(async () => {
    mockFirestore.collections.clear();
    mockFirestore.docs.clear();
    mockFirestore.listeners.clear();
    vi.clearAllMocks();

    const { createFirestoreDataStore: factory } = await import('./dataStore');
    dataStore = factory({} as never, 'test-user');
  });

  it('reports no data for an empty store', async () => {
    const hasData = await dataStore.hasData();
    expect(hasData).toBe(false);
  });

  it('saves an exercise and reports data', async () => {
    const exercise: Exercise = {
      id: 'ex_1',
      name: 'Bench Press',
      muscleGroup: 'Chest',
      logs: [{ date: '2026-01-01', weight: 80, reps: 8 }],
      order: 0,
    };

    await dataStore.saveExercise(exercise);

    const hasData = await dataStore.hasData();
    expect(hasData).toBe(true);
  });

  it('emits snapshots after subscribing', async () => {
    const captured: DataStoreSnapshot[] = [];
    const statuses: DataStoreStatus[] = [];

    const unsubscribe = dataStore.subscribe(
      (snapshot) => captured.push(snapshot),
      (status) => statuses.push(status)
    );

    const exercise: Exercise = {
      id: 'ex_1',
      name: 'Squat',
      muscleGroup: 'Legs',
      logs: [],
      order: 0,
    };

    await dataStore.saveExercise(exercise);
    await dataStore.saveMuscleGroups(['Legs']);
    await dataStore.saveGroupSortPreference({ field: 'weight', direction: 'asc' });

    unsubscribe();

    const latest = captured[captured.length - 1];
    expect(latest.exercises).toHaveLength(1);
    expect(latest.exercises[0].name).toBe('Squat');
    expect(latest.muscleGroups).toEqual(['Legs']);
    expect(latest.groupSortPreference).toEqual({ field: 'weight', direction: 'asc' });
    expect(statuses.length).toBeGreaterThan(0);
  });

  it('deletes an exercise', async () => {
    const exercise: Exercise = {
      id: 'ex_1',
      name: 'Deadlift',
      muscleGroup: 'Back',
      logs: [],
      order: 0,
    };

    await dataStore.saveExercise(exercise);
    await dataStore.deleteExercise('ex_1');

    const hasData = await dataStore.hasData();
    expect(hasData).toBe(false);
  });

  it('saves and deletes a routine', async () => {
    const routine: Routine = {
      id: 'routine_1',
      name: 'Pull Day',
      days: [
        {
          id: 'day_1',
          name: 'Day A',
          exercises: [{ exerciseId: 'ex_1', sets: 3, reps: '8', dropset: false, toFailure: false }],
        },
      ],
      order: 0,
    };

    await dataStore.saveRoutine(routine);

    const captured: DataStoreSnapshot[] = [];
    const unsubscribe = dataStore.subscribe((snapshot) => captured.push(snapshot), () => undefined);
    await new Promise((resolve) => setTimeout(resolve, 0));
    unsubscribe();

    expect(captured[captured.length - 1].routines).toHaveLength(1);

    await dataStore.deleteRoutine('routine_1');

    const afterDelete: DataStoreSnapshot[] = [];
    const unsubscribe2 = dataStore.subscribe((snapshot) => afterDelete.push(snapshot), () => undefined);
    await new Promise((resolve) => setTimeout(resolve, 0));
    unsubscribe2();

    expect(afterDelete[afterDelete.length - 1].routines).toHaveLength(0);
  });

  it('resets data to defaults', async () => {
    const exercise: Exercise = {
      id: 'ex_1',
      name: 'Old Exercise',
      muscleGroup: 'Old Group',
      logs: [],
      order: 0,
    };

    await dataStore.saveExercise(exercise);
    await dataStore.saveMuscleGroups(['Old Group']);

    await dataStore.resetData();

    const captured: DataStoreSnapshot[] = [];
    const unsubscribe = dataStore.subscribe((snapshot) => captured.push(snapshot), () => undefined);
    await new Promise((resolve) => setTimeout(resolve, 0));
    unsubscribe();

    const latest = captured[captured.length - 1];
    expect(latest.muscleGroups.length).toBeGreaterThan(0);
    expect(latest.exercises.length).toBeGreaterThan(0);
    expect(latest.exercises.some((e) => e.name === 'Old Exercise')).toBe(false);
  });
});
