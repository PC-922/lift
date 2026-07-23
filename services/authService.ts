import {
  GoogleAuthProvider,
  signInWithPopup,
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

function notify(user: AuthUser, mode: AuthMode): void {
  listeners.forEach((listener) => listener(user, mode));
}

function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

async function signInWithGoogle(): Promise<AuthUser> {
  if (!isFirebaseAvailable() || !auth) {
    setStoredAuthMode('google');
    notify(null, 'google');
    return null;
  }

  const provider = new GoogleAuthProvider();

  if (isMobile()) {
    await signInWithRedirect(auth, provider);
    return null;
  }

  try {
    const result = await signInWithPopup(auth, provider);
    setStoredAuthMode('google');
    notify(result.user, 'google');
    return result.user;
  } catch (error) {
    console.error('Google sign-in failed', error);
    setStoredAuthMode(null);
    notify(null, null);
    return null;
  }
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

  getRedirectResult(auth).catch((error) => {
    // An unsupported environment or a missing redirect should fall through to
    // onAuthStateChanged. Only log real redirect failures.
    const code = (error as { code?: string }).code;
    if (code !== 'auth/operation-not-supported-in-this-environment') {
      console.error('Redirect result error', error);
    }
  });

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
