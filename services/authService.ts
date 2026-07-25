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
import { ensureUserProfile } from './userProfileService';

export type AuthUser = User | null;

type AuthListener = (user: AuthUser, mode: AuthMode) => void;

const listeners = new Set<AuthListener>();

export const AUTH_TIMEOUT_MS = 5000;

function getStoredAuthMode(): AuthMode {
  return preferencesService.getPrefs().authMode ?? null;
}

function setStoredAuthMode(mode: AuthMode): void {
  preferencesService.savePrefs({ authMode: mode });
}

function notify(user: AuthUser, mode: AuthMode) {
  listeners.forEach((listener) => listener(user, mode));
}

export interface SignInResult {
  user: AuthUser;
  isNewUser: boolean;
}

async function signInWithGoogle(): Promise<SignInResult> {
  if (!isFirebaseAvailable() || !auth) {
    return { user: null, isNewUser: false };
  }

  const provider = new GoogleAuthProvider();

  try {
    const result = await signInWithPopup(auth, provider);
    setStoredAuthMode('google');
    const isNewUser = result.user.metadata?.creationTime === result.user.metadata?.lastSignInTime;
    if (isNewUser) {
      ensureUserProfile(result.user).catch(() => {});
    }
    notify(result.user, 'google');
    return { user: result.user, isNewUser };
  } catch (popupError) {
    const code = (popupError as { code?: string }).code;
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/popup-closed-by-user' ||
      code === 'auth/cancelled-popup-request'
    ) {
      setStoredAuthMode('google');
      await signInWithRedirect(auth, provider);
      return { user: null, isNewUser: false };
    }
    setStoredAuthMode(null);
    throw popupError;
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

let redirectHandled = false;

function subscribe(callback: AuthListener): () => void {
  listeners.add(callback);

  if (!isFirebaseAvailable() || !auth) {
    callback(null, getStoredAuthMode());
    return () => {
      listeners.delete(callback);
    };
  }

  if (!redirectHandled) {
    redirectHandled = true;
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          setStoredAuthMode('google');
          const isNewUser = result.user.metadata?.creationTime === result.user.metadata?.lastSignInTime;
          if (isNewUser) {
            ensureUserProfile(result.user).catch(() => {});
          }
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
