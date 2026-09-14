import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import type { AuthUser, GuestResult, SignInResult } from '../../domain/Authentication';
import type { AuthMode } from '../../domain/PreferencesRepository';
import { useApplicationServices } from '../ApplicationProvider';

export type AuthPhase = 'resolving' | 'authenticated' | 'fallback' | 'unauthenticated';

interface AuthContextValue {
  user: AuthUser;
  mode: AuthMode;
  phase: AuthPhase;
  fallbackUid: string | null;
  signInWithGoogle: () => Promise<SignInResult>;
  continueAsGuest: () => Promise<GuestResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const AUTH_TIMEOUT_MS = 12000;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { authentication, preferences } = useApplicationServices();
  const [user, setUser] = useState<AuthUser>(null);
  const [mode, setMode] = useState<AuthMode>(null);
  const [phase, setPhase] = useState<AuthPhase>('resolving');
  const [fallbackUid, setFallbackUid] = useState<string | null>(null);

  const resolveOffline = useCallback((nextMode: AuthMode) => {
    setUser(null);
    setMode(nextMode);
    const lastUid = preferences.getLastUid();
    setFallbackUid(lastUid);
    setPhase(lastUid ? 'fallback' : 'unauthenticated');
  }, [preferences]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const resolvePhase = (nextUser: AuthUser, nextMode: AuthMode) => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = undefined;
      }
      setUser(nextUser);
      setMode(nextMode);
      if (nextUser) {
        setPhase('authenticated');
        setFallbackUid(null);
        return;
      }
      resolveOffline(nextMode);
    };

    timeout = setTimeout(() => {
      const prefs = preferences.getPrefs();
      resolvePhase(null, prefs.authMode ?? null);
    }, AUTH_TIMEOUT_MS);

    let unsubscribe = () => undefined;
    try {
      unsubscribe = authentication.subscribe(resolvePhase);
    } catch {
      resolveOffline(preferences.getPrefs().authMode ?? null);
    }

    return () => {
      unsubscribe();
      if (timeout) clearTimeout(timeout);
    };
  }, [authentication, preferences, resolveOffline]);

  const signInWithGoogle = useCallback(async (): Promise<SignInResult> => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timeoutResult = new Promise<SignInResult>((resolve) => {
      timeout = setTimeout(() => resolve({
        user: null,
        isNewUser: false,
        error: { code: 'auth/timeout', message: 'Authentication timed out' },
      }), AUTH_TIMEOUT_MS);
    });
    let result: SignInResult;
    try {
      result = await Promise.race([authentication.signInWithGoogle(), timeoutResult]);
    } catch (error) {
      result = {
        user: null,
        isNewUser: false,
        error: {
          code: 'auth/unknown',
          message: error instanceof Error ? error.message : 'Unknown authentication error',
        },
      };
    } finally {
      if (timeout) clearTimeout(timeout);
    }
    if (!result.user) resolveOffline(preferences.getPrefs().authMode ?? null);
    return result;
  }, [authentication, preferences, resolveOffline]);

  const value: AuthContextValue = {
    user,
    mode,
    phase,
    fallbackUid,
    signInWithGoogle,
    continueAsGuest: () => authentication.continueAsGuest(),
    signOut: () => authentication.signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
