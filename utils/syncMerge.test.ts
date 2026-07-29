import { describe, it, expect } from 'vitest';
import { mergeSyncData, SEED_TIMESTAMP, LEGACY_TIMESTAMP } from './syncMerge';
import { Exercise, Routine, Tombstone } from '../types';

function exercise(id: string, updatedAt?: string): Exercise {
  return { id, name: id, muscleGroup: 'Pecho', logs: [], updatedAt };
}

function routine(id: string, updatedAt?: string): Routine {
  return { id, name: id, days: [], updatedAt };
}

describe('mergeSyncData', () => {
  it('keeps local-only data', () => {
    const result = mergeSyncData({
      localExercises: [exercise('ex1', '2026-01-02T00:00:00.000Z')],
      remoteExercises: [],
      localRoutines: [],
      remoteRoutines: [],
      localTombstones: { exercises: {}, routines: {} },
      remoteTombstones: { exercises: {}, routines: {} },
      localGroups: ['Pecho'],
      remoteGroups: [],
    });

    expect(result.exercises).toHaveLength(1);
    expect(result.exercises[0].id).toBe('ex1');
  });

  it('keeps remote-only data', () => {
    const result = mergeSyncData({
      localExercises: [],
      remoteExercises: [exercise('ex1', '2026-01-02T00:00:00.000Z')],
      localRoutines: [],
      remoteRoutines: [],
      localTombstones: { exercises: {}, routines: {} },
      remoteTombstones: { exercises: {}, routines: {} },
      localGroups: [],
      remoteGroups: ['Espalda'],
    });

    expect(result.exercises).toHaveLength(1);
    expect(result.groups).toContain('Espalda');
  });

  it('picks the most recent version when both sides exist', () => {
    const local = exercise('ex1', '2026-01-03T00:00:00.000Z');
    local.name = 'Local';
    const remote = exercise('ex1', '2026-01-02T00:00:00.000Z');
    remote.name = 'Remote';

    const result = mergeSyncData({
      localExercises: [local],
      remoteExercises: [remote],
      localRoutines: [],
      remoteRoutines: [],
      localTombstones: { exercises: {}, routines: {} },
      remoteTombstones: { exercises: {}, routines: {} },
      localGroups: [],
      remoteGroups: [],
    });

    expect(result.exercises).toHaveLength(1);
    expect(result.exercises[0].name).toBe('Local');
  });

  it('treats remote data without updatedAt as legacy real data that beats seed data', () => {
    const seed = exercise('ex1', SEED_TIMESTAMP);
    const remoteLegacy = exercise('ex1');
    remoteLegacy.name = 'RemoteLegacy';

    const result = mergeSyncData({
      localExercises: [seed],
      remoteExercises: [remoteLegacy],
      localRoutines: [],
      remoteRoutines: [],
      localTombstones: { exercises: {}, routines: {} },
      remoteTombstones: { exercises: {}, routines: {} },
      localGroups: [],
      remoteGroups: [],
    });

    expect(result.exercises[0].name).toBe('RemoteLegacy');
  });

  it('lets a local edit with explicit updatedAt beat legacy remote data', () => {
    const local = exercise('ex1', '2026-07-26T00:00:00.000Z');
    local.name = 'LocalEdit';
    const remoteLegacy = exercise('ex1');
    remoteLegacy.name = 'RemoteLegacy';

    const result = mergeSyncData({
      localExercises: [local],
      remoteExercises: [remoteLegacy],
      localRoutines: [],
      remoteRoutines: [],
      localTombstones: { exercises: {}, routines: {} },
      remoteTombstones: { exercises: {}, routines: {} },
      localGroups: [],
      remoteGroups: [],
    });

    expect(result.exercises[0].name).toBe('LocalEdit');
  });

  it('deletes data when a tombstone is newer than both versions', () => {
    const tombstones: Record<string, Tombstone> = { ex1: { deletedAt: '2026-07-27T00:00:00.000Z' } };

    const result = mergeSyncData({
      localExercises: [exercise('ex1', '2026-07-25T00:00:00.000Z')],
      remoteExercises: [exercise('ex1', '2026-07-26T00:00:00.000Z')],
      localRoutines: [],
      remoteRoutines: [],
      localTombstones: { exercises: tombstones, routines: {} },
      remoteTombstones: { exercises: {}, routines: {} },
      localGroups: [],
      remoteGroups: [],
    });

    expect(result.exercises).toHaveLength(0);
  });

  it('keeps data when it is newer than the tombstone', () => {
    const tombstones: Record<string, Tombstone> = { ex1: { deletedAt: '2026-07-25T00:00:00.000Z' } };

    const result = mergeSyncData({
      localExercises: [exercise('ex1', '2026-07-26T00:00:00.000Z')],
      remoteExercises: [],
      localRoutines: [],
      remoteRoutines: [],
      localTombstones: { exercises: tombstones, routines: {} },
      remoteTombstones: { exercises: {}, routines: {} },
      localGroups: [],
      remoteGroups: [],
    });

    expect(result.exercises).toHaveLength(1);
  });

  it('unions muscle groups', () => {
    const result = mergeSyncData({
      localExercises: [],
      remoteExercises: [],
      localRoutines: [],
      remoteRoutines: [],
      localTombstones: { exercises: {}, routines: {} },
      remoteTombstones: { exercises: {}, routines: {} },
      localGroups: ['A', 'B'],
      remoteGroups: ['B', 'C'],
    });

    expect(result.groups).toEqual(['A', 'B', 'C']);
  });

  it('merges tombstones keeping the most recent deletion', () => {
    const result = mergeSyncData({
      localExercises: [],
      remoteExercises: [],
      localRoutines: [],
      remoteRoutines: [],
      localTombstones: { exercises: { ex1: { deletedAt: '2026-01-02T00:00:00.000Z' } }, routines: {} },
      remoteTombstones: { exercises: { ex1: { deletedAt: '2026-01-03T00:00:00.000Z' } }, routines: {} },
      localGroups: [],
      remoteGroups: [],
    });

    expect(result.tombstones.exercises.ex1.deletedAt).toBe('2026-01-03T00:00:00.000Z');
  });

  it('merges routines by most recent updatedAt', () => {
    const local = routine('r1', '2026-01-03T00:00:00.000Z');
    const remote = routine('r1', '2026-01-01T00:00:00.000Z');

    const result = mergeSyncData({
      localExercises: [],
      remoteExercises: [],
      localRoutines: [local],
      remoteRoutines: [remote],
      localTombstones: { exercises: {}, routines: {} },
      remoteTombstones: { exercises: {}, routines: {} },
      localGroups: [],
      remoteGroups: [],
    });

    expect(result.routines).toHaveLength(1);
    expect(result.routines[0].id).toBe('r1');
  });
});
