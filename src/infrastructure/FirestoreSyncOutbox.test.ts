import { describe, expect, it, vi } from 'vitest';
import {
  createFirestoreSyncOutbox,
  mergeRemoteSyncRecord,
  type SyncOperation,
  type SyncOutboxStore,
  type SyncRecord,
  type SyncRemoteGateway,
} from './FirestoreSyncOutbox';

class MemoryOutboxStore implements SyncOutboxStore {
  operations: SyncOperation[] = [];

  async read(): Promise<readonly SyncOperation[]> {
    return structuredClone(this.operations);
  }

  async write(operations: readonly SyncOperation[]): Promise<void> {
    this.operations = structuredClone(operations);
  }
}

function operation(id: string, overrides: Partial<SyncOperation> = {}): SyncOperation {
  return {
    id,
    entity: 'exercise',
    recordId: `record-${id}`,
    kind: 'upsert',
    value: { id: `record-${id}`, name: id },
    updatedAt: '2026-09-24T10:00:00.000Z',
    deviceId: 'device-a',
    attempts: 0,
    ...overrides,
  };
}

function remoteGateway(write = vi.fn(async () => undefined)): SyncRemoteGateway {
  return { write };
}

describe('createFirestoreSyncOutbox', () => {
  it('drains durable mutations in insertion order and reports zero pending work', async () => {
    const store = new MemoryOutboxStore();
    const gateway = remoteGateway();
    const outbox = createFirestoreSyncOutbox({ store, gateway });

    await outbox.enqueue(operation('first'));
    await outbox.enqueue(operation('second'));
    await outbox.drain();

    expect(gateway.write).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: 'first' }));
    expect(gateway.write).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: 'second' }));
    expect(await store.read()).toEqual([]);
    expect(outbox.getStatus()).toMatchObject({ hasPendingWrites: false, pendingOperations: 0, failedOperations: 0 });
  });

  it('keeps a failed write durable, increments its retry count, and retries it before later writes', async () => {
    const store = new MemoryOutboxStore();
    const write = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(undefined);
    const outbox = createFirestoreSyncOutbox({ store, gateway: remoteGateway(write) });

    await outbox.enqueue(operation('first'));
    await outbox.enqueue(operation('second'));
    await outbox.drain();

    expect((await store.read()).map(({ id, attempts }) => ({ id, attempts }))).toEqual([{ id: 'first', attempts: 1 }, { id: 'second', attempts: 0 }]);
    expect(outbox.getStatus()).toMatchObject({ hasPendingWrites: true, pendingOperations: 2, failedOperations: 1, lastSyncError: 'offline' });

    await outbox.drain();

    expect(write.mock.calls.map(([item]) => item.id)).toEqual(['first', 'first', 'second']);
    expect(await store.read()).toEqual([]);
  });

  it('restores a failed durable queue and exposes its pending error status before retrying', async () => {
    const store = new MemoryOutboxStore();
    const first = createFirestoreSyncOutbox({
      store,
      gateway: remoteGateway(vi.fn().mockRejectedValue(new Error('offline'))),
    });

    await first.enqueue(operation('first'));
    await first.drain();

    const write = vi.fn().mockResolvedValue(undefined);
    const restored = createFirestoreSyncOutbox({ store, gateway: remoteGateway(write) });
    await restored.ready();

    expect(restored.getStatus()).toMatchObject({
      hasPendingWrites: true,
      pendingOperations: 1,
      failedOperations: 1,
      lastSyncError: 'offline',
    });

    await restored.drain();
    expect(write).toHaveBeenCalledWith(expect.objectContaining({ id: 'first', attempts: 1 }));
    expect(restored.getStatus()).toMatchObject({ hasPendingWrites: false, pendingOperations: 0 });
  });

  it('keeps writes enqueued while a drain is in progress', async () => {
    const store = new MemoryOutboxStore();
    let releaseFirstWrite: (() => void) | undefined;
    let markFirstWriteStarted: (() => void) | undefined;
    const firstWrite = new Promise<void>((resolve) => { releaseFirstWrite = resolve; });
    const firstWriteStarted = new Promise<void>((resolve) => { markFirstWriteStarted = resolve; });
    const write = vi.fn()
      .mockImplementationOnce(async () => {
        markFirstWriteStarted?.();
        return firstWrite;
      })
      .mockResolvedValue(undefined);
    const outbox = createFirestoreSyncOutbox({ store, gateway: remoteGateway(write) });

    await outbox.enqueue(operation('first'));
    const draining = outbox.drain();
    await firstWriteStarted;
    await outbox.enqueue(operation('second'));
    releaseFirstWrite?.();
    await draining;

    expect(write.mock.calls.map(([item]) => item.id)).toEqual(['first', 'second']);
    expect(await store.read()).toEqual([]);
  });

  it('preserves delete operations as tombstones until the remote gateway confirms them', async () => {
    const store = new MemoryOutboxStore();
    const write = vi.fn().mockRejectedValue(new Error('offline'));
    const outbox = createFirestoreSyncOutbox({ store, gateway: remoteGateway(write) });
    const tombstone = operation('deleted', { kind: 'delete', value: undefined });

    await outbox.enqueue(tombstone);
    await outbox.drain();

    expect(await store.read()).toEqual([{ ...tombstone, attempts: 1, lastError: 'offline' }]);
    expect(write).toHaveBeenCalledWith(expect.objectContaining({ kind: 'delete', value: undefined }));
  });
});

describe('mergeRemoteSyncRecord', () => {
  const local: SyncRecord<{ name: string }> = {
    value: { name: 'local' },
    updatedAt: '2026-09-24T10:00:00.000Z',
    deviceId: 'device-a',
  };

  it('keeps a pending local record even when the remote record is newer', () => {
    const remote: SyncRecord<{ name: string }> = { value: { name: 'remote' }, updatedAt: '2026-09-24T11:00:00.000Z', deviceId: 'device-b' };
    expect(mergeRemoteSyncRecord(local, remote, true)).toEqual(local);
  });

  it('otherwise selects newest timestamps and breaks equal timestamps by device id', () => {
    const newer: SyncRecord<{ name: string }> = { value: { name: 'remote' }, updatedAt: '2026-09-24T11:00:00.000Z', deviceId: 'device-b' };
    const tied: SyncRecord<{ name: string }> = { value: { name: 'remote' }, updatedAt: local.updatedAt, deviceId: 'device-z' };

    expect(mergeRemoteSyncRecord(local, newer, false)).toEqual(newer);
    expect(mergeRemoteSyncRecord(local, tied, false)).toEqual(tied);
  });
});
