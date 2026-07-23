import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService, AuthUser } from '../services/authService';
import { AuthMode } from '../services/preferencesService';

interface AuthContextValue {
  user: AuthUser;
  mode: AuthMode;
  isLoading: boolean;
  signInWithGoogle: () => Promise<AuthUser>;
  continueAsGuest: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser>(null);
  const [mode, setMode] = useState<AuthMode>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    return authService.subscribe((nextUser, nextMode) => {
      setUser(nextUser);
      setMode(nextMode);
      setIsLoading(false);
    });
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
