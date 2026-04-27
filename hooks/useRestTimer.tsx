import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { RestTimerState } from '../types';

interface RestTimerContextType extends RestTimerState {
  startTimer: (seconds: number) => void;
  stopTimer: () => void;
  resetTimer: () => void;
  addTime: (seconds: number) => void;
  setMinimized: (minimized: boolean) => void;
  setDuration: (seconds: number) => void;
}

const RestTimerContext = createContext<RestTimerContextType | undefined>(undefined);

export const RestTimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<RestTimerState>(() => {
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem) {
        const saved = localStorage.getItem('restTimerState');
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            ...parsed,
            isActive: false, // Never start active after reload for safety
            isMinimized: true // Always start minimized on app load as requested
          };
        }
      }
    } catch (e) {
      // Fallback to default
    }
    return {
      remainingTime: 0,
      isActive: false,
      duration: 90,
      isMinimized: true,
    };
  });

  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined' && localStorage.setItem) {
        localStorage.setItem('restTimerState', JSON.stringify({
          remainingTime: state.remainingTime,
          duration: state.duration,
          isMinimized: state.isMinimized,
          isActive: false // Don't persist active state
        }));
      }
    } catch (e) {
      // Ignore
    }
  }, [state.remainingTime, state.duration, state.isMinimized]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (state.isActive && state.remainingTime > 0) {
      interval = setInterval(() => {
        setState((prev) => ({
          ...prev,
          remainingTime: Math.max(0, prev.remainingTime - 1),
          isActive: prev.remainingTime > 1,
        }));
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [state.isActive, state.remainingTime]);

  const startTimer = useCallback((seconds: number) => {
    setState((prev) => ({
      remainingTime: seconds,
      isActive: seconds > 0,
      duration: seconds,
      isMinimized: prev.isMinimized,
    }));
  }, []);

  const stopTimer = useCallback(() => {
    setState((prev) => ({ ...prev, isActive: false }));
  }, []);

  const resetTimer = useCallback(() => {
    setState((prev) => ({
      ...prev,
      remainingTime: prev.duration,
      isActive: true,
      isMinimized: false,
    }));
  }, []);

  const addTime = useCallback((seconds: number) => {
    setState((prev) => ({
      ...prev,
      remainingTime: prev.remainingTime + seconds,
      duration: prev.duration + seconds,
    }));
  }, []);

  const setMinimized = useCallback((isMinimized: boolean) => {
    setState((prev) => ({ ...prev, isMinimized }));
  }, []);

  const setDuration = useCallback((duration: number) => {
    setState((prev) => ({ ...prev, duration, remainingTime: duration }));
  }, []);

  return (
    <RestTimerContext.Provider value={{ ...state, startTimer, stopTimer, resetTimer, addTime, setMinimized, setDuration }}>
      {children}
    </RestTimerContext.Provider>
  );
};

export const useRestTimer = () => {
  const context = useContext(RestTimerContext);
  if (context === undefined) {
    throw new Error('useRestTimer must be used within a RestTimerProvider');
  }
  return context;
};
