import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth, isFirebaseAvailable } from './firebase';
import { preferencesService, AuthMode } from './preferencesService';

export type AuthUser = User | null;

type AuthListener = (user: AuthUser, mode: AuthMode) => void;

const listeners = new Set<AuthListener>();

function getStoredAuthMode(): AuthMode {
  return preferencesService.getPrefs().authMode ?? null;
}

function setStoredAuthMode(mode: AuthMode): void {
  preferencesService.savePrefs({ authMode: mode });
}

function notify(user: AuthUser, mode: AuthMode): void {
  listeners.forEach((listener) => listener(user, mode));
}

async function signInWithGoogle(): Promise<AuthUser> {
  if (!isFirebaseAvailable() || !auth) {
    setStoredAuthMode('google');
    notify(null, 'google');
    return null;
  }
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  setStoredAuthMode('google');
  notify(result.user, 'google');
  return result.user;
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

function subscribe(callback: AuthListener): () => void {
  listeners.add(callback);

  if (!isFirebaseAvailable() || !auth) {
    callback(null, getStoredAuthMode());
    return () => {
      listeners.delete(callback);
    };
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
