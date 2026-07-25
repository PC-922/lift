import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService, AuthUser, SignInResult, AUTH_TIMEOUT_MS } from '../services/authService';
import { AuthMode } from '../services/preferencesService';

interface AuthContextValue {
  user: AuthUser;
  mode: AuthMode;
  isLoading: boolean;
  signInWithGoogle: () => Promise<SignInResult>;
  continueAsGuest: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser>(null);
  const [mode, setMode] = useState<AuthMode>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const unsubscribe = authService.subscribe((nextUser, nextMode) => {
      setUser(nextUser);
      setMode(nextMode);
      setIsLoading(false);
      if (timeout) {
        clearTimeout(timeout);
        timeout = undefined;
      }
    });

    timeout = setTimeout(() => {
      setIsLoading(false);
    }, AUTH_TIMEOUT_MS);

    return () => {
      unsubscribe();
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  const value: AuthContextValue = {
    user,
    mode,
    isLoading,
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
