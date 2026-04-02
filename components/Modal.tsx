import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  open: boolean;
  onClose: () => void;
  position?: 'center' | 'bottom';
  children: React.ReactNode;
}

export const Modal: React.FC<Props> = ({ open, onClose, position = 'center', children }) => {
  const mountedAt = useRef(0);

  useEffect(() => {
    if (!open) return;
    mountedAt.current = Date.now();
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const handleBackdrop = (e: React.MouseEvent | React.TouchEvent) => {
    // Ignore the first 350ms to prevent the touchEnd that opened the modal
    // from immediately closing it (same touch event bubble).
    if (Date.now() - mountedAt.current < 350) return;
    if (e.target === e.currentTarget) onClose();
  };

  const alignClass = position === 'bottom'
    ? 'items-end justify-center'
    : 'items-center justify-center';

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex ${alignClass} bg-black/40 backdrop-blur-sm`}
      onClick={handleBackdrop}
      onTouchEnd={handleBackdrop}
    >
      {children}
    </div>,
    document.body
  );
};
