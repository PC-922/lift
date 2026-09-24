import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type AuthError,
  type User,
} from 'firebase/auth';
import type {
  Authentication,
  AuthUser,
  SignInResult,
} from '../domain/Authentication';
import type { AuthMode, PreferencesRepository } from '../domain/PreferencesRepository';
import { auth, isFirebaseAvailable } from './firebase';
import { ensureUserProfile } from './userProfileService';

type AuthListener = (user: AuthUser, mode: AuthMode) => void;

function normalizeError(error: unknown): { code: string; message: string } {
  const authError = error as AuthError;
  return {
    code: authError.code ?? 'auth/unknown',
    message: authError.message ?? 'Unknown authentication error',
  };
}

function isPopupDismissError(code: string): boolean {
  return [
    'auth/popup-blocked',
    'auth/popup-closed-by-user',
    'auth/cancelled-popup-request',
  ].includes(code);
}

export class FirebaseAuthentication implements Authentication {
  private readonly listeners = new Set<AuthListener>();
  private redirectHandled = false;

  constructor(private readonly preferences: PreferencesRepository) {}

  async signInWithGoogle(): Promise<SignInResult> {
    if (!isFirebaseAvailable() || !auth) {
      return {
        user: null,
        isNewUser: false,
        error: { code: 'auth/unavailable', message: 'Firebase authentication is unavailable' },
      };
    }

    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      return this.completeGoogleSignIn(result.user);
    } catch (error) {
      const normalized = normalizeError(error);
      if (!isPopupDismissError(normalized.code)) this.setMode(null);
      return { user: null, isNewUser: false, error: normalized };
    }
  }

  async signOut(): Promise<void> {
    this.setMode(null);
    this.notify(null, null);
    if (isFirebaseAvailable() && auth) {
      try {
        await signOut(auth);
      } catch (error) {
        console.error('Failed to sign out from Firebase', error);
      }
    }
  }

  subscribe(callback: AuthListener): () => void {
    this.listeners.add(callback);
    if (!isFirebaseAvailable() || !auth) {
      callback(null, this.getMode());
      return () => this.listeners.delete(callback);
    }

    this.handleRedirect();
    let resolved = false;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const mode = user ? 'google' : null;
      if (user) {
        resolved = true;
        this.setMode(mode);
        this.preferences.setLastUid(user.uid);
        callback(user, mode);
      } else if (resolved || this.getMode() !== 'google') {
        resolved = true;
        this.setMode(null);
        callback(null, mode);
      }
    });

    return () => {
      unsubscribe();
      this.listeners.delete(callback);
    };
  }

  private completeGoogleSignIn(user: User): SignInResult {
    this.setMode('google');
    this.preferences.setLastUid(user.uid);
    const isNewUser = user.metadata?.creationTime === user.metadata?.lastSignInTime;
    if (isNewUser) ensureUserProfile(user).catch(() => {});
    this.notify(user, 'google');
    return { user, isNewUser };
  }

  private handleRedirect(): void {
    if (this.redirectHandled || !auth) return;
    this.redirectHandled = true;
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) this.completeGoogleSignIn(result.user);
      })
      .catch((error) => {
        const code = (error as { code?: string }).code;
        if (code !== 'auth/operation-not-supported-in-this-environment') {
          console.error('Redirect result error', error);
        }
      });
  }

  private getMode(): AuthMode {
    return this.preferences.getPrefs().authMode ?? null;
  }

  private setMode(mode: AuthMode): void {
    this.preferences.savePrefs({ authMode: mode });
  }

  private notify(user: AuthUser, mode: AuthMode): void {
    this.listeners.forEach((listener) => listener(user, mode));
  }
}
