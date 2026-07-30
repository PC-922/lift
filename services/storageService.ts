import { User } from 'firebase/auth';
import { db } from './firebase';
import { StorageManagerInterface } from '../types';
import { LocalStorageAdapter, SCHEMA_VERSION } from './storage/localStorageAdapter';
import { SyncAdapter } from './storage/syncAdapter';
import { FirestoreGateway } from './storage/firestoreGateway';
import { makeId } from './storage/id';

export { makeId, SCHEMA_VERSION };

let currentAdapter: StorageManagerInterface | null = null;
let currentUid: string | null = null;
let currentMode: 'google' | 'guest' | null = null;

function isSyncAdapter(adapter: StorageManagerInterface): adapter is SyncAdapter {
  return adapter instanceof SyncAdapter;
}

function createAdapter(user: User | null, mode: 'google' | 'guest' | null): StorageManagerInterface {
  if (user && db) {
    const local = new LocalStorageAdapter();
    const gateway = new FirestoreGateway(db);
    return new SyncAdapter(local, gateway, user.uid);
  }
  return new LocalStorageAdapter();
}

export function setStorageUser(user: User | null, mode: 'google' | 'guest' | null): void {
  const uid = user?.uid ?? `local_${mode ?? 'anonymous'}`;
  if (currentAdapter && currentUid === uid && currentMode === mode) {
    return;
  }

  if (currentAdapter && isSyncAdapter(currentAdapter)) {
    currentAdapter.dispose();
  }

  currentAdapter = createAdapter(user, mode);
  currentUid = uid;
  currentMode = mode;
}

export function getCurrentAdapter(): StorageManagerInterface | null {
  return currentAdapter;
}

export function getCurrentSyncAdapter(): SyncAdapter | null {
  return currentAdapter && isSyncAdapter(currentAdapter) ? currentAdapter : null;
}

export const storageManager: StorageManagerInterface = new Proxy({} as StorageManagerInterface, {
  get(_target, prop: keyof StorageManagerInterface) {
    if (!currentAdapter) {
      throw new Error('Storage adapter not initialized. Call setStorageUser first.');
    }
    const value = currentAdapter[prop];
    if (typeof value === 'function') {
      return value.bind(currentAdapter);
    }
    return value;
  },
});
