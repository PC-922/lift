import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService, AuthUser, SignInResult, GuestResult } from '../services/authService';
import { AuthMode, preferencesService } from '../services/preferencesService';

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

// Time before falling back to the last known uid when the session cannot be restored.
const RESOLVE_TIMEOUT_MS = 3000;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser>(null);
  const [mode, setMode] = useState<AuthMode>(null);
  const [phase, setPhase] = useState<AuthPhase>('resolving');
  const [fallbackUid, setFallbackUid] = useState<string | null>(null);

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
      const lastUid = preferencesService.getLastUid();
      if (lastUid) {
        setPhase('fallback');
        setFallbackUid(lastUid);
      } else {
        setPhase('unauthenticated');
      }
    };

    const unsubscribe = authService.subscribe(resolvePhase);

    timeout = setTimeout(() => {
      const prefs = preferencesService.getPrefs();
      resolvePhase(null, prefs.authMode ?? null);
    }, RESOLVE_TIMEOUT_MS);

    return () => {
      unsubscribe();
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  const value: AuthContextValue = {
    user,
    mode,
    phase,
    fallbackUid,
    signInWithGoogle: () => authService.signInWithGoogle(),
    continueAsGuest: () => authService.continueAsGuest(),
    signOut: () => authService.signOut(),
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
