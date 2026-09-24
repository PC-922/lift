import { describe, expect, it, vi } from 'vitest';
import type { Exercise } from '../domain';
import type { SyncStatus, TrainingRepository, TrainingSnapshot } from '../domain/TrainingRepository';
import { createLocalFirstTrainingRepository } from './LocalFirstTrainingRepository';
import type { FirestoreSyncOutbox, SyncOperation } from './FirestoreSyncOutbox';

const emptySnapshot = (): TrainingSnapshot => ({ exercises: [], routines: [], muscleGroups: [], workouts: [] });

function exercise(id: string, updatedAt?: string): Exercise {
  return { id, name: id, muscleGroup: 'Chest', logs: [], order: 0, updatedAt };
}

class MemoryRepository implements TrainingRepository {
  private snapshot = emptySnapshot();
  private readonly subscribers = new Set<(snapshot: TrainingSnapshot) => void>();

  getSnapshot(): TrainingSnapshot { return structuredClone(this.snapshot); }
  subscribe(onData: (snapshot: TrainingSnapshot) => void, _onStatus: (status: SyncStatus) => void): () => void {
    this.subscribers.add(onData);
    onData(this.getSnapshot());
    return () => this.subscribers.delete(onData);
  }
  private emit() { this.subscribers.forEach((subscriber) => subscriber(this.getSnapshot())); }
  async saveExercise(value: Exercise) { this.snapshot = { ...this.snapshot, exercises: [...this.snapshot.exercises.filter(({ id }) => id !== value.id), value] }; this.emit(); }
  async deleteExercise(id: string) { this.snapshot = { ...this.snapshot, exercises: this.snapshot.exercises.filter((item) => item.id !== id) }; this.emit(); }
  async saveRoutine() { throw new Error('not implemented'); }
  async deleteRoutine() { throw new Error('not implemented'); }
  async saveMuscleGroups() { throw new Error('not implemented'); }
  async saveWorkout() { throw new Error('not implemented'); }
  async deleteWorkout() { throw new Error('not implemented'); }
  async resetData() { this.snapshot = emptySnapshot(); this.emit(); }
}

function outbox(write: (operation: SyncOperation) => Promise<void>): FirestoreSyncOutbox {
  return {
    ready: vi.fn(async () => undefined),
    enqueue: vi.fn(async () => undefined),
    drain: vi.fn(async () => write({} as SyncOperation)),
    getStatus: vi.fn(() => ({ hasPendingWrites: true, fromCache: true, pendingOperations: 1 })),
  };
}

describe('createLocalFirstTrainingRepository', () => {
  it('commits locally before an unavailable cloud synchronization completes', async () => {
    const local = new MemoryRepository();
    const remote = new MemoryRepository();
    const sync = outbox(async () => new Promise<void>(() => undefined));
    const repository = createLocalFirstTrainingRepository({ local, remote, outbox: sync, deviceId: 'device-a', now: () => '2026-09-24T10:00:00.000Z', operationId: () => 'operation-1' });

    const saved = repository.saveExercise(exercise('local'));
    await expect(saved).resolves.toBeUndefined();
    expect(local.getSnapshot().exercises).toEqual([exercise('local')]);
    expect(sync.enqueue).toHaveBeenCalledWith(expect.objectContaining({ entity: 'exercise', kind: 'upsert', recordId: 'local' }));
  });

  it('bootstraps an empty local profile from existing remote data without overwriting a local mutation', async () => {
    const local = new MemoryRepository();
    const remote = new MemoryRepository();
    await remote.saveExercise(exercise('remote', '2026-09-24T09:00:00.000Z'));
    const repository = createLocalFirstTrainingRepository({ local, remote, outbox: outbox(async () => undefined), deviceId: 'device-a', now: () => '2026-09-24T10:00:00.000Z', operationId: () => 'operation-1' });

    const stop = repository.subscribe(() => undefined, () => undefined);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(local.getSnapshot().exercises.map(({ id }) => id)).toEqual(['remote']);

    await repository.saveExercise(exercise('local', '2026-09-24T11:00:00.000Z'));
    await remote.saveExercise(exercise('later-remote', '2026-09-24T12:00:00.000Z'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(local.getSnapshot().exercises.map(({ id }) => id).sort()).toEqual(['later-remote', 'local', 'remote']);
    stop();
  });
});
