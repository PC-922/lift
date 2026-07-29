import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalStorageAdapter } from './localStorageAdapter';
import { SyncAdapter } from './syncAdapter';
import { FirestoreGateway, PulledData } from './firestoreGateway';
import { Exercise, Routine, Tombstone } from '../../types';

const mockStorage: Record<string, string> = {};

vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => mockStorage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value; }),
  removeItem: vi.fn((key: string) => { delete mockStorage[key]; }),
  clear: vi.fn(() => { Object.keys(mockStorage).forEach((k) => delete mockStorage[k]); }),
  length: 0,
  key: vi.fn((index: number) => Object.keys(mockStorage)[index] ?? null),
});

function makeExercise(id: string, name: string, updatedAt: string): Exercise {
  return { id, name, muscleGroup: 'Pecho', logs: [], updatedAt };
}

function makeRoutine(id: string, name: string, updatedAt: string): Routine {
  return { id, name, days: [], updatedAt };
}

class FakeFirestoreGateway extends FirestoreGateway {
  public pulled: PulledData = {
    exercises: [],
    routines: [],
    groups: [],
    tombstones: { exercises: {}, routines: {} },
  };
  public pushed: PulledData | null = null;

  constructor() {
    super(null as unknown as import('firebase/firestore').Firestore);
  }

  override async pullData(): Promise<PulledData> {
    return JSON.parse(JSON.stringify(this.pulled)) as PulledData;
  }

  override async pushData(
    _uid: string,
    exercises: Exercise[],
    routines: Routine[],
    groups: string[],
    tombstones: { exercises: Record<string, Tombstone>; routines: Record<string, Tombstone> },
    previousRemote: PulledData
  ): Promise<void> {
    this.pushed = { exercises, routines, groups, tombstones };
    this.pulled = { exercises, routines, groups, tombstones };
  }

  override async pushExercise(_uid: string, exercise: Exercise): Promise<void> {
    const existing = this.pulled.exercises.findIndex((e) => e.id === exercise.id);
    if (existing >= 0) {
      this.pulled.exercises[existing] = exercise;
    } else {
      this.pulled.exercises.push(exercise);
    }
  }

  override async pushRoutine(_uid: string, routine: Routine): Promise<void> {
    const existing = this.pulled.routines.findIndex((r) => r.id === routine.id);
    if (existing >= 0) {
      this.pulled.routines[existing] = routine;
    } else {
      this.pulled.routines.push(routine);
    }
  }
}

describe('SyncAdapter', () => {
  let local: LocalStorageAdapter;
  let gateway: FakeFirestoreGateway;
  let adapter: SyncAdapter;

  beforeEach(() => {
    localStorage.clear();
    local = new LocalStorageAdapter();
    gateway = new FakeFirestoreGateway();
    adapter = new SyncAdapter(local, gateway, 'test-user');
    vi.stubGlobal('navigator', { onLine: true, language: 'en' } as Navigator);
  });

  it('exposes local data to the UI', async () => {
    await local.saveExercise(makeExercise('ex1', 'Local', '2026-01-02T00:00:00.000Z'));
    expect(await adapter.getExercises()).toHaveLength(1);
  });

  it('pushes local-only data to remote on sync', async () => {
    await local.saveExercise(makeExercise('ex1', 'Local', '2026-01-02T00:00:00.000Z'));
    await adapter.sync();

    expect(gateway.pushed?.exercises).toHaveLength(1);
    expect(gateway.pushed?.exercises[0].id).toBe('ex1');
  });

  it('pulls remote-only data and merges it locally', async () => {
    gateway.pulled.exercises = [makeExercise('ex1', 'Remote', '2026-01-02T00:00:00.000Z')];
    gateway.pulled.groups = ['Espalda'];

    await adapter.sync();

    expect((await adapter.getExercises()).map((e) => e.id)).toContain('ex1');
    expect(await adapter.getMuscleGroups()).toContain('Espalda');
  });

  it('pushes a single exercise after saveExercise', async () => {
    await adapter.saveExercise(makeExercise('ex1', 'Local', '2026-01-02T00:00:00.000Z'));

    expect(gateway.pulled.exercises).toHaveLength(1);
    expect(gateway.pulled.exercises[0].id).toBe('ex1');
  });

  it('pushes a single routine after saveRoutine', async () => {
    await adapter.saveRoutine(makeRoutine('r1', 'Routine', '2026-01-02T00:00:00.000Z'));

    expect(gateway.pulled.routines).toHaveLength(1);
    expect(gateway.pulled.routines[0].id).toBe('r1');
  });

  it('creates a tombstone and pushes it when deleting an exercise', async () => {
    await adapter.saveExercise(makeExercise('ex1', 'Local', '2026-01-02T00:00:00.000Z'));
    await adapter.deleteExercise('ex1');

    expect((await adapter.getExercises()).map((e) => e.id)).not.toContain('ex1');
    expect(gateway.pushed?.tombstones.exercises.ex1).toBeDefined();
  });

  it('creates a tombstone and pushes it when deleting a routine', async () => {
    await adapter.saveRoutine(makeRoutine('r1', 'Routine', '2026-01-02T00:00:00.000Z'));
    await adapter.deleteRoutine('r1');

    expect((await adapter.getRoutines()).map((r) => r.id)).not.toContain('r1');
    expect(gateway.pushed?.tombstones.routines.r1).toBeDefined();
  });

  it('skips network calls when offline', async () => {
    vi.stubGlobal('navigator', { onLine: false, language: 'en' } as Navigator);
    const pushSpy = vi.spyOn(gateway, 'pushData');

    await adapter.saveExercise(makeExercise('ex1', 'Local', '2026-01-02T00:00:00.000Z'));

    expect(pushSpy).not.toHaveBeenCalled();
  });

  it('resolves local wins when timestamps are newer', async () => {
    await local.saveExercise(makeExercise('ex1', 'LocalWin', '2026-01-03T00:00:00.000Z'));
    gateway.pulled.exercises = [makeExercise('ex1', 'Remote', '2026-01-02T00:00:00.000Z')];

    await adapter.sync();

    expect((await adapter.getExercises())[0].name).toBe('LocalWin');
    expect(gateway.pushed?.exercises[0].name).toBe('LocalWin');
  });
});
