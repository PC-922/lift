import type { Exercise, Routine, Workout } from '../domain';
import type { SyncStatus, TrainingRepository, TrainingSnapshot } from '../domain/TrainingRepository';
import type { FirestoreSyncOutbox, SyncOperation, SyncRemoteGateway } from './FirestoreSyncOutbox';

export interface LocalFirstTrainingRepositoryOptions {
  readonly local: TrainingRepository;
  readonly remote: TrainingRepository;
  readonly outbox: FirestoreSyncOutbox;
  readonly deviceId: string;
  readonly now: () => string;
  readonly operationId: () => string;
  readonly syncEnabled?: boolean;
}

function emptySnapshot(): TrainingSnapshot {
  return { exercises: [], routines: [], muscleGroups: [], workouts: [] };
}

function copySnapshot(snapshot: TrainingSnapshot): TrainingSnapshot {
  return structuredClone(snapshot);
}

function recordTimestamp(record: { updatedAt?: string }): string {
  return record.updatedAt ?? '';
}

function mergeRecords<T extends { id: string; updatedAt?: string }>(
  local: readonly T[],
  remote: readonly T[],
  hasPendingMutation: (id: string) => boolean
): T[] {
  const localById = new Map(local.map((record) => [record.id, record]));
  const remoteById = new Map(remote.map((record) => [record.id, record]));
  const ids = new Set([...localById.keys(), ...remoteById.keys()]);
  return [...ids].flatMap((id) => {
    const localRecord = localById.get(id);
    const remoteRecord = remoteById.get(id);
    if (!localRecord) return remoteRecord ? [remoteRecord] : [];
    if (!remoteRecord || hasPendingMutation(id)) return [localRecord];
    return recordTimestamp(remoteRecord) > recordTimestamp(localRecord) ? [remoteRecord] : [localRecord];
  });
}

function sameSnapshot(left: TrainingSnapshot, right: TrainingSnapshot): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function mergeSnapshot(
  local: TrainingSnapshot,
  remote: TrainingSnapshot,
  hasPendingMutation: (entity: SyncOperation['entity'], recordId: string) => boolean
): TrainingSnapshot {
  const merged: TrainingSnapshot = {
    exercises: mergeRecords(local.exercises, remote.exercises, (id) => hasPendingMutation('exercise', id)),
    routines: mergeRecords(local.routines, remote.routines, (id) => hasPendingMutation('routine', id)),
    workouts: mergeRecords(local.workouts, remote.workouts, (id) => hasPendingMutation('workout', id)),
    muscleGroups: hasPendingMutation('muscleGroups', 'groups') || remote.muscleGroups.length === 0
      ? [...local.muscleGroups]
      : [...remote.muscleGroups],
  };
  return merged;
}

function operation(
  entity: SyncOperation['entity'],
  recordId: string,
  kind: SyncOperation['kind'],
  value: unknown,
  options: LocalFirstTrainingRepositoryOptions
): SyncOperation {
  return {
    id: options.operationId(),
    entity,
    recordId,
    kind,
    value,
    updatedAt: options.now(),
    deviceId: options.deviceId,
    attempts: 0,
  };
}

export function createUnavailableTrainingRepository(message: string): TrainingRepository {
  const unavailable = async (): Promise<never> => { throw new Error(message); };
  return {
    getSnapshot: emptySnapshot,
    subscribe(onData, onStatus) {
      onData(emptySnapshot());
      onStatus({ hasPendingWrites: false, fromCache: true, lastSyncError: message });
      return () => undefined;
    },
    saveExercise: unavailable,
    deleteExercise: unavailable,
    saveRoutine: unavailable,
    deleteRoutine: unavailable,
    saveMuscleGroups: unavailable,
    saveWorkout: unavailable,
    deleteWorkout: unavailable,
    resetData: unavailable,
  };
}

export function createTrainingRepositorySyncGateway(repository: TrainingRepository): SyncRemoteGateway {
  return {
    async write(item) {
      switch (item.entity) {
        case 'exercise':
          return item.kind === 'delete' ? repository.deleteExercise(item.recordId) : repository.saveExercise(item.value as Exercise);
        case 'routine':
          return item.kind === 'delete' ? repository.deleteRoutine(item.recordId) : repository.saveRoutine(item.value as Routine);
        case 'muscleGroups':
          return repository.saveMuscleGroups(item.value as string[]);
        case 'workout':
          return item.kind === 'delete' ? repository.deleteWorkout(item.recordId) : repository.saveWorkout(item.value as Workout);
        case 'reset':
          return repository.resetData();
      }
    },
  };
}

export function createLocalFirstTrainingRepository(options: LocalFirstTrainingRepositoryOptions): TrainingRepository {
  const { local, remote, outbox } = options;
  const syncEnabled = options.syncEnabled ?? true;
  let current = local.getSnapshot();
  let onData: ((snapshot: TrainingSnapshot) => void) | undefined;
  let onStatus: ((status: SyncStatus) => void) | undefined;
  let localStatus: SyncStatus = { hasPendingWrites: false, fromCache: true };
  let syncError: string | undefined;
  const pendingMutations = new Set<string>();

  const emitStatus = () => {
    const sync = outbox.getStatus();
    onStatus?.({
      ...localStatus,
      ...sync,
      fromCache: true,
      lastSyncError: syncError ?? sync.lastSyncError,
    });
  };

  const queue = async (item: SyncOperation) => {
    pendingMutations.add(`${item.entity}:${item.recordId}`);
    try {
      await outbox.enqueue(item);
      emitStatus();
      if (!syncEnabled) return;
      void outbox.drain()
        .then(() => {
          if (!outbox.getStatus().hasPendingWrites) pendingMutations.clear();
        })
        .catch((error: unknown) => { syncError = error instanceof Error ? error.message : 'Remote synchronization failed.'; })
        .finally(emitStatus);
    } catch (error) {
      syncError = error instanceof Error ? error.message : 'Local synchronization queue failed.';
      emitStatus();
    }
  };

  const saveLocalThenQueue = async (item: SyncOperation, save: () => Promise<void>) => {
    await save();
    await queue(item);
  };

  const mergeRemote = async (remoteSnapshot: TrainingSnapshot) => {
    const localSnapshot = local.getSnapshot();
    const next = mergeSnapshot(localSnapshot, remoteSnapshot, (entity, recordId) => pendingMutations.has(`${entity}:${recordId}`));
    if (sameSnapshot(localSnapshot, next)) return;

    for (const value of next.exercises) await local.saveExercise(value);
    for (const value of next.routines) await local.saveRoutine(value);
    for (const value of next.workouts) await local.saveWorkout(value);
    if (JSON.stringify(localSnapshot.muscleGroups) !== JSON.stringify(next.muscleGroups)) await local.saveMuscleGroups(next.muscleGroups);
  };

  return {
    getSnapshot: () => copySnapshot(current),
    subscribe(nextOnData, nextOnStatus) {
      onData = nextOnData;
      onStatus = nextOnStatus;
      const unsubscribeLocal = local.subscribe(
        (snapshot) => {
          current = copySnapshot(snapshot);
          onData?.(copySnapshot(current));
        },
        (status) => {
          localStatus = status;
          emitStatus();
        }
      );
      const unsubscribeRemote = syncEnabled ? remote.subscribe(
        (snapshot) => { void mergeRemote(snapshot).catch((error: unknown) => { syncError = error instanceof Error ? error.message : 'Remote synchronization failed.'; emitStatus(); }); },
        (status) => {
          if (status.lastSyncError) syncError = status.lastSyncError;
          emitStatus();
        }
      ) : () => undefined;
      void outbox.ready().then(() => {
        emitStatus();
        return syncEnabled ? outbox.drain() : undefined;
      }).then(() => {
        if (syncEnabled && !outbox.getStatus().hasPendingWrites) pendingMutations.clear();
        emitStatus();
      }).catch((error: unknown) => {
        syncError = error instanceof Error ? error.message : 'Local synchronization queue failed.';
        emitStatus();
      });
      return () => {
        unsubscribeLocal();
        unsubscribeRemote();
        onData = undefined;
        onStatus = undefined;
      };
    },
    saveExercise(value) {
      return saveLocalThenQueue(operation('exercise', value.id, 'upsert', value, options), () => local.saveExercise(value));
    },
    deleteExercise(id) {
      return saveLocalThenQueue(operation('exercise', id, 'delete', undefined, options), () => local.deleteExercise(id));
    },
    saveRoutine(value) {
      return saveLocalThenQueue(operation('routine', value.id, 'upsert', value, options), () => local.saveRoutine(value));
    },
    deleteRoutine(id) {
      return saveLocalThenQueue(operation('routine', id, 'delete', undefined, options), () => local.deleteRoutine(id));
    },
    saveMuscleGroups(groups) {
      return saveLocalThenQueue(operation('muscleGroups', 'groups', 'upsert', groups, options), () => local.saveMuscleGroups(groups));
    },
    saveWorkout(value) {
      return saveLocalThenQueue(operation('workout', value.id, 'upsert', value, options), () => local.saveWorkout(value));
    },
    deleteWorkout(id) {
      return saveLocalThenQueue(operation('workout', id, 'delete', undefined, options), () => local.deleteWorkout(id));
    },
    resetData() {
      return saveLocalThenQueue(operation('reset', 'all', 'reset', undefined, options), () => local.resetData());
    },
  };
}
