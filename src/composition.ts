import type { ApplicationServices } from './UI/ApplicationProvider';
import { browserIdGenerator } from './infrastructure/BrowserIdGenerator';
import { FirebaseAuthentication } from './infrastructure/FirebaseAuthentication';
import { createFirestoreTrainingRepository } from './infrastructure/FirestoreTrainingRepository';
import { createFirestoreSyncOutbox, createNativeSyncOutboxStore } from './infrastructure/FirestoreSyncOutbox';
import { createIndexedDbTrainingRepository } from './infrastructure/IndexedDbTrainingRepository';
import {
  createLocalFirstTrainingRepository,
  createTrainingRepositorySyncGateway,
  createUnavailableTrainingRepository,
} from './infrastructure/LocalFirstTrainingRepository';
import { localStoragePreferencesRepository } from './infrastructure/LocalStoragePreferencesRepository';
import { localStorageWorkoutDraftRepository } from './infrastructure/LocalStorageWorkoutDraftRepository';
import { systemClock } from './infrastructure/SystemClock';
import { db } from './infrastructure/firebase';

const DEVICE_ID_KEY = 'lift_device_id_v1';

function deviceId(): string {
  try {
    const stored = localStorage.getItem(DEVICE_ID_KEY);
    if (stored) return stored;
    const next = browserIdGenerator.generate('device');
    localStorage.setItem(DEVICE_ID_KEY, next);
    return next;
  } catch {
    return browserIdGenerator.generate('device');
  }
}

export function composeApplication(): ApplicationServices {
  return {
    authentication: new FirebaseAuthentication(localStoragePreferencesRepository),
    preferences: localStoragePreferencesRepository,
    workoutDrafts: localStorageWorkoutDraftRepository,
    trainingRepository(uid) {
      const local = createIndexedDbTrainingRepository(uid);
      const remote = db
        ? createFirestoreTrainingRepository(db, uid)
        : createUnavailableTrainingRepository('Firestore is not initialized. Changes remain stored on this device.');
      const outbox = createFirestoreSyncOutbox({
        store: createNativeSyncOutboxStore(),
        gateway: createTrainingRepositorySyncGateway(remote),
      });
      return createLocalFirstTrainingRepository({
        local,
        remote,
        outbox,
        deviceId: deviceId(),
        now: systemClock.now,
        operationId: () => browserIdGenerator.generate('sync'),
      });
    },
    ids: browserIdGenerator,
    clock: systemClock,
  };
}
