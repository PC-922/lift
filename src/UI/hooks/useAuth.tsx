import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import type { AuthUser, SignInResult } from '../../domain/Authentication';
import type { AuthMode } from '../../domain/PreferencesRepository';
import { useApplicationServices } from '../ApplicationProvider';

export type AuthPhase = 'authenticated';

interface AuthContextValue {
  user: AuthUser;
  mode: AuthMode;
  phase: AuthPhase;
  localProfileId: string;
  signInWithGoogle: () => Promise<SignInResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const AUTH_TIMEOUT_MS = 12000;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { authentication, preferences } = useApplicationServices();
  const [user, setUser] = useState<AuthUser>(null);
  const [mode, setMode] = useState<AuthMode>(null);
  const [localProfileId] = useState(() => preferences.getLocalProfileId());

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const resolvePhase = (nextUser: AuthUser, nextMode: AuthMode) => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = undefined;
      }
      setUser(nextUser);
      setMode(nextUser ? nextMode : null);
    };

    timeout = setTimeout(() => {
      resolvePhase(null, null);
    }, AUTH_TIMEOUT_MS);

    let unsubscribe: () => void = () => undefined;
    try {
      unsubscribe = authentication.subscribe(resolvePhase);
    } catch {
      resolvePhase(null, null);
    }

    return () => {
      unsubscribe();
      if (timeout) clearTimeout(timeout);
    };
  }, [authentication]);

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
    return result;
  }, [authentication]);

  const value: AuthContextValue = {
    user,
    mode,
    phase: 'authenticated',
    localProfileId,
    signInWithGoogle,
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
