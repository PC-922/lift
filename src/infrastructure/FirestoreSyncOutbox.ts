import type { SyncStatus } from '../domain/TrainingRepository';

const DATABASE_NAME = 'lift-training-sync';
const DATABASE_VERSION = 1;
const OUTBOX_STORE = 'operations';

export type SyncEntity = 'exercise' | 'routine' | 'muscleGroups' | 'workout' | 'reset';
export type SyncOperationKind = 'upsert' | 'delete' | 'reset';

export interface SyncOperation {
  readonly id: string;
  readonly entity: SyncEntity;
  readonly recordId: string;
  readonly kind: SyncOperationKind;
  readonly value?: unknown;
  readonly updatedAt: string;
  readonly deviceId: string;
  readonly attempts: number;
  readonly lastError?: string;
}

export interface SyncRecord<T> {
  readonly value: T;
  readonly updatedAt: string;
  readonly deviceId: string;
  readonly deleted?: boolean;
}

export interface SyncOutboxStore {
  read(): Promise<readonly SyncOperation[]>;
  write(operations: readonly SyncOperation[]): Promise<void>;
}

export interface SyncRemoteGateway {
  write(operation: SyncOperation): Promise<void>;
}

export interface FirestoreSyncOutboxOptions {
  readonly store: SyncOutboxStore;
  readonly gateway: SyncRemoteGateway;
}

export interface FirestoreSyncOutbox {
  ready(): Promise<void>;
  enqueue(operation: SyncOperation): Promise<void>;
  drain(): Promise<void>;
  getStatus(): SyncStatus;
}

export class SyncOutboxStoreError extends Error {
  constructor(readonly code: 'unavailable' | 'transaction', message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'SyncOutboxStoreError';
  }
}

function copyOperations(operations: readonly SyncOperation[]): SyncOperation[] {
  return structuredClone(operations);
}

function storageError(error: unknown): SyncOutboxStoreError {
  if (error instanceof SyncOutboxStoreError) return error;
  const name = error instanceof DOMException ? error.name : undefined;
  if (name === 'InvalidStateError' || name === 'NotSupportedError' || name === 'SecurityError') {
    return new SyncOutboxStoreError('unavailable', 'IndexedDB is unavailable in this browser.', error);
  }
  return new SyncOutboxStoreError('transaction', 'The synchronization outbox transaction failed.', error);
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
      if (!request.result.objectStoreNames.contains(OUTBOX_STORE)) {
        request.result.createObjectStore(OUTBOX_STORE);
      }
    });
    request.addEventListener('success', () => resolve(request.result), { once: true });
    request.addEventListener('error', () => reject(request.error), { once: true });
    request.addEventListener('blocked', () => reject(new DOMException('IndexedDB is blocked', 'InvalidStateError')), { once: true });
  });
}

export function createNativeSyncOutboxStore(factory: IDBFactory | undefined = globalThis.indexedDB): SyncOutboxStore {
  if (!factory) {
    const unavailable = async (): Promise<never> => {
      throw new SyncOutboxStoreError('unavailable', 'IndexedDB is unavailable in this browser.');
    };
    return { read: unavailable, write: unavailable };
  }

  const database = openNativeDatabase(factory);
  return {
    async read() {
      try {
        const db = await database;
        const transaction = db.transaction(OUTBOX_STORE, 'readonly');
        const operations = await requestResult(transaction.objectStore(OUTBOX_STORE).get('queue') as IDBRequest<SyncOperation[] | undefined>);
        await transactionComplete(transaction);
        return copyOperations(operations ?? []);
      } catch (error) {
        throw storageError(error);
      }
    },
    async write(operations) {
      try {
        const db = await database;
        const transaction = db.transaction(OUTBOX_STORE, 'readwrite');
        transaction.objectStore(OUTBOX_STORE).put(copyOperations(operations), 'queue');
        await transactionComplete(transaction);
      } catch (error) {
        throw storageError(error);
      }
    },
  };
}

export function mergeRemoteSyncRecord<T>(
  local: SyncRecord<T>,
  remote: SyncRecord<T>,
  hasPendingLocalMutation: boolean
): SyncRecord<T> {
  if (hasPendingLocalMutation) return local;
  if (local.updatedAt !== remote.updatedAt) {
    return local.updatedAt > remote.updatedAt ? local : remote;
  }
  return local.deviceId >= remote.deviceId ? local : remote;
}

function asMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Remote synchronization failed.';
}

function statusFor(operations: readonly SyncOperation[]): SyncStatus {
  const failed = operations.filter(({ attempts }) => attempts > 0);
  return {
    hasPendingWrites: operations.length > 0,
    fromCache: true,
    pendingOperations: operations.length,
    failedOperations: failed.length,
    lastSyncError: failed[0]?.lastError,
  };
}

export function createFirestoreSyncOutbox({ store, gateway }: FirestoreSyncOutboxOptions): FirestoreSyncOutbox {
  let status = statusFor([]);
  let operations: SyncOperation[] = [];
  let loadPromise: Promise<void> | undefined;
  let drainPromise: Promise<void> | undefined;
  let mutation = Promise.resolve();

  const load = (): Promise<void> => {
    if (!loadPromise) {
      loadPromise = store.read().then((operations) => {
        const copied = copyOperations(operations);
        status = statusFor(copied);
        return copied;
      }).then((storedOperations) => {
        operations = storedOperations;
      }).catch((error) => {
        status = {
          ...status,
          hasPendingWrites: false,
          pendingOperations: 0,
          failedOperations: 0,
          lastSyncError: asMessage(error),
        };
        throw error;
      });
    }
    return loadPromise;
  };

  const persist = async (nextOperations: readonly SyncOperation[]) => {
    const copied = copyOperations(nextOperations);
    await store.write(copied);
    operations = copied;
    status = statusFor(copied);
  };

  const mutate = async <T>(change: () => Promise<T>): Promise<T> => {
    const current = mutation.then(change, change);
    mutation = current.then(() => undefined, () => undefined);
    return current;
  };

  return {
    ready: load,
    async enqueue(operation) {
      await load();
      await mutate(() => persist([...operations, { ...operation, attempts: operation.attempts ?? 0 }]));
    },
    drain() {
      if (!drainPromise) {
        drainPromise = (async () => {
          await load();
          while (operations.length > 0) {
            const current = await mutate(async () => operations[0]);
            if (!current) return;
            try {
              await gateway.write(current);
            } catch (error) {
              await mutate(() => {
                const index = operations.findIndex(({ id }) => id === current.id);
                if (index === -1) return Promise.resolve();
                const failed = {
                  ...current,
                  attempts: current.attempts + 1,
                  lastError: asMessage(error),
                };
                return persist([...operations.slice(0, index), failed, ...operations.slice(index + 1)]);
              });
              return;
            }
            await mutate(() => {
              const index = operations.findIndex(({ id }) => id === current.id);
              return index === -1 ? Promise.resolve() : persist([...operations.slice(0, index), ...operations.slice(index + 1)]);
            });
          }
        })().finally(() => {
          drainPromise = undefined;
        });
      }
      return drainPromise;
    },
    getStatus() {
      return { ...status };
    },
  };
}
