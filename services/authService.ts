import {
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth, isFirebaseAvailable } from './firebase';
import { preferencesService, AuthMode } from './preferencesService';

export type AuthUser = User | null;

type AuthListener = (user: AuthUser, mode: AuthMode) => void;

const listeners = new Set<AuthListener>();

const AUTH_TIMEOUT_MS = 5000;

function getStoredAuthMode(): AuthMode {
  return preferencesService.getPrefs().authMode ?? null;
}

function setStoredAuthMode(mode: AuthMode): void {
  preferencesService.savePrefs({ authMode: mode });
}

function notify(user: AuthUser, mode: AuthMode) {
  listeners.forEach((listener) => listener(user, mode));
}

async function signInWithGoogle(): Promise<AuthUser> {
  if (!isFirebaseAvailable() || !auth) {
    return null;
  }

  const provider = new GoogleAuthProvider();

  setStoredAuthMode('google');
  await signInWithRedirect(auth, provider);
  return null;
}

function continueAsGuest(): void {
  setStoredAuthMode('guest');
  notify(null, 'guest');
}

async function signOutUser(): Promise<void> {
  if (isFirebaseAvailable() && auth) {
    await signOut(auth);
  }
  setStoredAuthMode(null);
  notify(null, null);
}

let redirectPromise: Promise<void> | null = null;

function subscribe(callback: AuthListener): () => void {
  listeners.add(callback);

  if (!isFirebaseAvailable() || !auth) {
    callback(null, getStoredAuthMode());
    return () => {
      listeners.delete(callback);
    };
  }

  if (!redirectPromise) {
    redirectPromise = getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          setStoredAuthMode('google');
          notify(result.user, 'google');
        }
      })
      .catch((error) => {
        const code = (error as { code?: string }).code;
        if (code !== 'auth/operation-not-supported-in-this-environment') {
          console.error('Redirect result error', error);
        }
      });
  }

  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      setStoredAuthMode('google');
      callback(user, 'google');
    } else {
      const mode = getStoredAuthMode();
      callback(null, mode);
    }
  });

  return () => {
    unsubscribe();
    listeners.delete(callback);
  };
}

export const authService = {
  signInWithGoogle,
  continueAsGuest,
  signOut: signOutUser,
  subscribe,
};

export { AUTH_TIMEOUT_MS };
