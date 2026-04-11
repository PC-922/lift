import React, { createContext, useContext, useState, useCallback } from 'react';
import { makeId } from '../services/storageService';

export type ToastType = 'achievement' | 'info';

interface ToastMessage {
  id: string;
  text: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (text: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 3000;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, type: ToastType = 'achievement') => {
    const id = makeId('toast');
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

const ToastContainer: React.FC<{ toasts: ToastMessage[] }> = ({ toasts }) => {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed top-4 left-0 right-0 z-[9999] flex flex-col items-center gap-2 px-4 pointer-events-none"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
};

const Toast: React.FC<{ toast: ToastMessage }> = ({ toast }) => {
  const isAchievement = toast.type === 'achievement';
  return (
    <div
      className={`
        animate-slideDown max-w-sm w-full px-4 py-3 rounded-2xl shadow-lg
        flex items-center gap-3
        ${isAchievement
          ? 'bg-yellow-400 text-yellow-900'
          : 'bg-ios-card text-ios-text'}
      `}
    >
      {isAchievement && <span className="text-lg">🏆</span>}
      <p className="text-sm font-semibold flex-1">{toast.text}</p>
    </div>
  );
};
