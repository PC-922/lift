import type { AuthMode } from './PreferencesRepository';

export interface UserIdentity {
  readonly uid: string;
  readonly email: string | null;
  readonly displayName: string | null;
  readonly photoURL: string | null;
  readonly isAnonymous: boolean;
}

export type AuthUser = UserIdentity | null;

export interface SignInResult {
  user: AuthUser;
  isNewUser: boolean;
  error?: { code: string; message: string };
}

export interface GuestResult {
  success: boolean;
  needsNetwork?: boolean;
}

export interface Authentication {
  signInWithGoogle(): Promise<SignInResult>;
  continueAsGuest(): Promise<GuestResult>;
  signOut(): Promise<void>;
  subscribe(callback: (user: AuthUser, mode: AuthMode) => void): () => void;
}
