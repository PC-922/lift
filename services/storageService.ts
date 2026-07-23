import { User } from 'firebase/auth';
import { db } from './firebase';
import { StorageManagerInterface } from '../types';
import { LocalStorageAdapter, SCHEMA_VERSION } from './storage/localStorageAdapter';
import { FirestoreAdapter } from './storage/firestoreAdapter';
import { makeId } from './storage/id';

export { makeId, SCHEMA_VERSION };

let currentAdapter: StorageManagerInterface | null = null;
let currentUid: string | null = null;

function getAdapterForUser(user: User | null, mode: 'google' | 'guest' | null): StorageManagerInterface {
  const uid = user?.uid ?? `guest_${mode ?? 'anonymous'}`;
  if (currentAdapter && currentUid === uid) {
    return currentAdapter;
  }

  if (user && db && mode === 'google') {
    currentAdapter = new FirestoreAdapter(db, user.uid);
  } else {
    currentAdapter = new LocalStorageAdapter();
  }
  currentUid = uid;
  return currentAdapter;
}

export function setStorageUser(user: User | null, mode: 'google' | 'guest' | null): void {
  currentAdapter = getAdapterForUser(user, mode);
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
