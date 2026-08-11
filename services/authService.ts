import {
  GoogleAuthProvider,
  signInAnonymously,
  signInWithPopup,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  User,
  AuthError,
} from 'firebase/auth';
import { auth, isFirebaseAvailable } from './firebase';
import { preferencesService, AuthMode } from './preferencesService';
import { ensureUserProfile } from './userProfileService';

export type AuthUser = User | null;

export interface SignInResult {
  user: AuthUser;
  isNewUser: boolean;
  error?: { code: string; message: string };
}

export interface GuestResult {
  success: boolean;
  needsNetwork?: boolean;
}

type AuthListener = (user: AuthUser, mode: AuthMode) => void;

const listeners = new Set<AuthListener>();

export const AUTH_TIMEOUT_MS = 5000;

function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

function getStoredAuthMode(): AuthMode {
  return preferencesService.getPrefs().authMode ?? null;
}

function setStoredAuthMode(mode: AuthMode): void {
  preferencesService.savePrefs({ authMode: mode });
}

function notify(user: AuthUser, mode: AuthMode) {
  listeners.forEach((listener) => listener(user, mode));
}

function normalizeError(error: unknown): { code: string; message: string } {
  const authError = error as AuthError;
  return {
    code: authError.code ?? 'auth/unknown',
    message: authError.message ?? 'Unknown authentication error',
  };
}

function inferAuthMode(user: AuthUser): AuthMode {
  if (!user) return getStoredAuthMode();
  return user.isAnonymous ? 'guest' : 'google';
}

function isPopupDismissError(code: string): boolean {
  return (
    code === 'auth/popup-blocked' ||
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request'
  );
}

function completeGoogleSignIn(user: User): SignInResult {
  setStoredAuthMode('google');
  preferencesService.setLastUid(user.uid);
  const isNewUser = user.metadata?.creationTime === user.metadata?.lastSignInTime;
  if (isNewUser) {
    ensureUserProfile(user).catch(() => {});
  }
  notify(user, 'google');
  return { user, isNewUser };
}

async function signInWithGoogle(): Promise<SignInResult> {
  if (!isFirebaseAvailable() || !auth) {
    return {
      user: null,
      isNewUser: false,
      error: { code: 'auth/unavailable', message: 'Firebase authentication is unavailable' },
    };
  }

  const provider = new GoogleAuthProvider();

  async function performPopupSignIn(): Promise<User> {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  }

  async function performPopupSignInFromCurrentUser(): Promise<User | null> {
    if (auth.currentUser?.isAnonymous) {
      return performPopupSignIn();
    }
    return performPopupSignIn();
  }

  try {
    const user = await performPopupSignInFromCurrentUser();
    if (!user) {
      return {
        user: null,
        isNewUser: false,
        error: { code: 'auth/popup-closed-by-user', message: 'Popup was closed before completing sign-in' },
      };
    }
    return completeGoogleSignIn(user);
  } catch (error) {
    const normalized = normalizeError(error);
    if (isPopupDismissError(normalized.code)) {
      return { user: null, isNewUser: false, error: normalized };
    }
    setStoredAuthMode(null);
    return { user: null, isNewUser: false, error: normalized };
  }
}

async function continueAsGuest(): Promise<GuestResult> {
  if (!isFirebaseAvailable() || !auth) {
    return { success: false };
  }

  if (!isOnline()) {
    return { success: false, needsNetwork: true };
  }

  try {
    const result = await signInAnonymously(auth);
    setStoredAuthMode('guest');
    preferencesService.setLastUid(result.user.uid);
    notify(result.user, 'guest');
    return { success: true };
  } catch (error) {
    console.error('Anonymous sign-in failed', error);
    return { success: false };
  }
}

async function signOutUser(): Promise<void> {
  if (!isFirebaseAvailable() || !auth) {
    setStoredAuthMode(null);
    notify(null, null);
    return;
  }

  await signOut(auth);

  try {
    const result = await signInAnonymously(auth);
    setStoredAuthMode('guest');
    notify(result.user, 'guest');
  } catch (error) {
    console.error('Failed to return to guest mode after sign-out', error);
    setStoredAuthMode(null);
    notify(null, null);
  }
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
          preferencesService.setLastUid(result.user.uid);
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

  let initialResolved = false;

  const unsubscribe = onAuthStateChanged(auth, (user) => {
    const mode = inferAuthMode(user);

    if (user) {
      initialResolved = true;
      setStoredAuthMode(mode);
      preferencesService.setLastUid(user.uid);
      callback(user, mode);
      return;
    }

    if (initialResolved) {
      callback(null, getStoredAuthMode());
      return;
    }

    initialResolved = true;
    const storedMode = getStoredAuthMode();
    if (storedMode === 'google') {
      return;
    }
    callback(null, storedMode);
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
