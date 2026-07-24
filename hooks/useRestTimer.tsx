import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { RestTimerState } from '../types';

interface RestTimerContextType extends RestTimerState {
  selectDuration: (seconds: number) => void;
  startTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  addTime: (seconds: number) => void;
  setMinimized: (minimized: boolean) => void;
}

const RestTimerContext = createContext<RestTimerContextType | undefined>(undefined);

const STORAGE_KEY = 'restTimerState';

const DEFAULT_DURATION = 90;

export const RestTimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<RestTimerState>(() => {
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem) {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as Partial<RestTimerState>;
          return {
            remainingTime: parsed.remainingTime ?? 0,
            duration: parsed.duration ?? DEFAULT_DURATION,
            isActive: false,
            isMinimized: true,
          };
        }
      }
    } catch {
      // fall through
    }
    return {
      remainingTime: 0,
      isActive: false,
      duration: DEFAULT_DURATION,
      isMinimized: true,
    };
  });

  const endTimeRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined' && localStorage.setItem) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          remainingTime: state.remainingTime,
          duration: state.duration,
          isMinimized: state.isMinimized,
          isActive: false,
        }));
      }
    } catch {
      // Ignore storage failures.
    }
  }, [state.remainingTime, state.duration, state.isMinimized]);

  const syncTimer = useCallback(() => {
    const endTime = endTimeRef.current;
    if (!endTime) return;

    const timeLeft = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    setState((prev) => ({
      ...prev,
      remainingTime: timeLeft,
      isActive: timeLeft > 0,
    }));

    if (timeLeft <= 0) {
      endTimeRef.current = null;
    }
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    if (state.isActive && state.remainingTime > 0) {
      endTimeRef.current = endTimeRef.current ?? Date.now() + state.remainingTime * 1000;

      const tick = () => {
        const endTime = endTimeRef.current;
        if (!endTime) return;

        const timeLeft = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));

        setState((prev) => ({
          ...prev,
          remainingTime: timeLeft,
          isActive: timeLeft > 0,
        }));

        if (timeLeft <= 0 && interval) {
          clearInterval(interval);
          interval = undefined;
          endTimeRef.current = null;
        }
      };

      tick();
      interval = setInterval(tick, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state.isActive, state.remainingTime]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [syncTimer]);

  const selectDuration = useCallback((seconds: number) => {
    endTimeRef.current = null;
    setState((prev) => ({
      ...prev,
      remainingTime: seconds,
      duration: seconds,
      isActive: false,
      isMinimized: false,
    }));
  }, []);

  const startTimer = useCallback(() => {
    setState((prev) => {
      if (prev.remainingTime <= 0) return prev;
      endTimeRef.current = Date.now() + prev.remainingTime * 1000;
      return {
        ...prev,
        isActive: true,
        isMinimized: false,
      };
    });
  }, []);

  const stopTimer = useCallback(() => {
    endTimeRef.current = null;
    setState((prev) => ({ ...prev, isActive: false }));
  }, []);

  const resetTimer = useCallback(() => {
    setState((prev) => {
      endTimeRef.current = null;
      return {
        ...prev,
        remainingTime: prev.duration,
        isActive: false,
        isMinimized: false,
      };
    });
  }, []);

  const addTime = useCallback((seconds: number) => {
    endTimeRef.current = endTimeRef.current ? endTimeRef.current + seconds * 1000 : null;
    setState((prev) => ({
      ...prev,
      remainingTime: prev.remainingTime + seconds,
    }));
  }, []);

  const setMinimized = useCallback((isMinimized: boolean) => {
    setState((prev) => ({ ...prev, isMinimized }));
  }, []);

  return (
    <RestTimerContext.Provider value={{ ...state, selectDuration, startTimer, stopTimer, resetTimer, addTime, setMinimized }}>
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
