import { FirebaseApp, initializeApp } from 'firebase/app';
import {
  Auth,
  browserLocalPersistence,
  getAuth,
  setPersistence,
} from 'firebase/auth';
import {
  Firestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

const requiredKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

function hasFirebaseConfig(): boolean {
  return requiredKeys.every(
    (key) => import.meta.env[key] && import.meta.env[key].length > 0
  );
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let initError: Error | null = null;

if (hasFirebaseConfig()) {
  try {
    app = initializeApp({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    });

    auth = getAuth(app);
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });

    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error('Failed to set auth persistence', error);
    });
  } catch (error) {
    initError = error instanceof Error ? error : new Error(String(error));
    console.error('Firebase initialization failed', initError);
    app = null;
    auth = null;
    db = null;
  }
} else {
  initError = new Error('Firebase configuration missing');
}

export { app, auth, db, initError };
export const isFirebaseAvailable = (): boolean =>
  app !== null && auth !== null && db !== null;

export function getInitError(): Error | null {
  return initError;
}
