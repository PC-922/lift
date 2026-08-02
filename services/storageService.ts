import { db } from './firebase';
import { createFirestoreDataStore, DataStore, DataStoreStatus } from './storage/dataStore';
import { makeId } from './storage/id';

export { makeId };
export type { DataStore, DataStoreStatus };

export function createDataStore(uid: string): DataStore {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  return createFirestoreDataStore(db, uid);
}
