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

function createAdapter(user: User | null, mode: 'google' | 'guest' | null): StorageManagerInterface {
  if (mode === 'google' && user && db) {
    const local = new LocalStorageAdapter();
    const gateway = new FirestoreGateway(db);
    return new SyncAdapter(local, gateway, user.uid);
  }
  return new LocalStorageAdapter();
}

export function setStorageUser(user: User | null, mode: 'google' | 'guest' | null): void {
  const uid = user?.uid ?? `guest_${mode ?? 'anonymous'}`;
  if (currentAdapter && currentUid === uid && currentMode === mode) {
    return;
  }
  currentAdapter = createAdapter(user, mode);
  currentUid = uid;
  currentMode = mode;
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
