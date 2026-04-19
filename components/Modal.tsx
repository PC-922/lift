import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  open: boolean;
  onClose: () => void;
  position?: 'center' | 'bottom';
  labelledBy?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<Props> = ({ open, onClose, position = 'center', labelledBy, children }) => {
  const mountedAt = useRef(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!open) {
      setIsReady(false);
      return;
    }
    mountedAt.current = Date.now();
    const timer = setTimeout(() => setIsReady(true), 400);

    document.body.style.overflow = 'hidden';
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleBackdrop = (e: React.MouseEvent | React.TouchEvent) => {
    if (Date.now() - mountedAt.current < 350) return;
    if (e.target === e.currentTarget) onClose();
  };

  const panelClass = position === 'bottom'
    ? 'mx-3 w-[min(100%-1.5rem,42rem)] max-h-[calc(100dvh-1.5rem)]'
    : 'mx-3 w-[min(100%-1.5rem,42rem)] max-h-[calc(100dvh-1.5rem)]';

  return createPortal(
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 backdrop-blur-[2px]"
      onClick={handleBackdrop}
      onTouchEnd={handleBackdrop}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`overflow-hidden rounded-3xl border border-app-border bg-app-surface shadow-2xl transition-opacity ${!isReady ? 'pointer-events-none' : ''} ${panelClass}`}
        onClick={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};
