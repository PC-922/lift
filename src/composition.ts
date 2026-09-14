import type { ApplicationServices } from './UI/ApplicationProvider';
import { browserIdGenerator } from './infrastructure/BrowserIdGenerator';
import { FirebaseAuthentication } from './infrastructure/FirebaseAuthentication';
import { createFirestoreTrainingRepository } from './infrastructure/FirestoreTrainingRepository';
import { localStoragePreferencesRepository } from './infrastructure/LocalStoragePreferencesRepository';
import { localStorageWorkoutDraftRepository } from './infrastructure/LocalStorageWorkoutDraftRepository';
import { systemClock } from './infrastructure/SystemClock';
import { db } from './infrastructure/firebase';

export function composeApplication(): ApplicationServices {
  return {
    authentication: new FirebaseAuthentication(localStoragePreferencesRepository),
    preferences: localStoragePreferencesRepository,
    workoutDrafts: localStorageWorkoutDraftRepository,
    trainingRepository(uid) {
      if (!db) throw new Error('Firestore is not initialized');
      return createFirestoreTrainingRepository(db, uid);
    },
    ids: browserIdGenerator,
    clock: systemClock,
  };
}
