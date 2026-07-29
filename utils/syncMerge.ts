import { Exercise, Routine, Tombstone } from '../types';

export const SEED_TIMESTAMP = '2000-01-01T00:00:00.000Z';
export const LEGACY_TIMESTAMP = '2024-06-01T00:00:00.000Z';

function getUpdatedAt(entity: { updatedAt?: string } | undefined, fallback: string): string {
  return entity?.updatedAt ?? fallback;
}

function isDeleted(id: string, local: Record<string, Tombstone>, remote: Record<string, Tombstone>, localUpdatedAt: string, remoteUpdatedAt: string): boolean {
  const localDeletedAt = local[id]?.deletedAt;
  const remoteDeletedAt = remote[id]?.deletedAt;
  const latestEntity = localUpdatedAt > remoteUpdatedAt ? localUpdatedAt : remoteUpdatedAt;
  if (localDeletedAt && localDeletedAt >= latestEntity) return true;
  if (remoteDeletedAt && remoteDeletedAt >= latestEntity) return true;
  return false;
}

function mergeEntities<T extends { id: string; updatedAt?: string }>(
  local: T[],
  remote: T[],
  localTombstones: Record<string, Tombstone>,
  remoteTombstones: Record<string, Tombstone>
): T[] {
  const byId = new Map<string, T>();
  const allIds = new Set<string>();

  local.forEach((item) => allIds.add(item.id));
  remote.forEach((item) => allIds.add(item.id));

  allIds.forEach((id) => {
    const localItem = local.find((item) => item.id === id);
    const remoteItem = remote.find((item) => item.id === id);
    const localUpdatedAt = getUpdatedAt(localItem, localItem ? LEGACY_TIMESTAMP : SEED_TIMESTAMP);
    const remoteUpdatedAt = getUpdatedAt(remoteItem, remoteItem ? LEGACY_TIMESTAMP : SEED_TIMESTAMP);

    if (isDeleted(id, localTombstones, remoteTombstones, localUpdatedAt, remoteUpdatedAt)) {
      return;
    }

    if (localItem && remoteItem) {
      const winner = localUpdatedAt >= remoteUpdatedAt ? localItem : remoteItem;
      byId.set(id, winner);
    } else if (localItem) {
      byId.set(id, localItem);
    } else if (remoteItem) {
      byId.set(id, remoteItem);
    }
  });

  return Array.from(byId.values());
}

function mergeTombstones(
  local: Record<string, Tombstone>,
  remote: Record<string, Tombstone>
): Record<string, Tombstone> {
  const merged: Record<string, Tombstone> = {};
  const allIds = new Set<string>([...Object.keys(local), ...Object.keys(remote)]);

  allIds.forEach((id) => {
    const localDeletedAt = local[id]?.deletedAt;
    const remoteDeletedAt = remote[id]?.deletedAt;
    if (localDeletedAt && remoteDeletedAt) {
      merged[id] = { deletedAt: localDeletedAt > remoteDeletedAt ? localDeletedAt : remoteDeletedAt };
    } else if (localDeletedAt) {
      merged[id] = { deletedAt: localDeletedAt };
    } else if (remoteDeletedAt) {
      merged[id] = { deletedAt: remoteDeletedAt };
    }
  });

  return merged;
}

export interface SyncMergeInput {
  localExercises: Exercise[];
  remoteExercises: Exercise[];
  localRoutines: Routine[];
  remoteRoutines: Routine[];
  localTombstones: { exercises: Record<string, Tombstone>; routines: Record<string, Tombstone> };
  remoteTombstones: { exercises: Record<string, Tombstone>; routines: Record<string, Tombstone> };
  localGroups: string[];
  remoteGroups: string[];
}

export interface SyncMergeOutput {
  exercises: Exercise[];
  routines: Routine[];
  groups: string[];
  tombstones: { exercises: Record<string, Tombstone>; routines: Record<string, Tombstone> };
}

export function mergeSyncData(input: SyncMergeInput): SyncMergeOutput {
  const exercises = mergeEntities(
    input.localExercises,
    input.remoteExercises,
    input.localTombstones.exercises,
    input.remoteTombstones.exercises
  );
  const routines = mergeEntities(
    input.localRoutines,
    input.remoteRoutines,
    input.localTombstones.routines,
    input.remoteTombstones.routines
  );
  const groups = Array.from(new Set([...input.localGroups, ...input.remoteGroups]));

  return {
    exercises,
    routines,
    groups,
    tombstones: {
      exercises: mergeTombstones(input.localTombstones.exercises, input.remoteTombstones.exercises),
      routines: mergeTombstones(input.localTombstones.routines, input.remoteTombstones.routines),
    },
  };
}
