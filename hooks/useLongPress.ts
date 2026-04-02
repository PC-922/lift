import React, { useRef, useCallback } from 'react';

const DEFAULT_DELAY = 500;
const SCROLL_THRESHOLD = 10;

interface Options {
  onLongPress: () => void;
  onTap?: () => void;
  delay?: number;
}

interface LongPressHandlers {
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
}

export function useLongPress({ onLongPress, onTap, delay = DEFAULT_DELAY }: Options): LongPressHandlers {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);
  const isScrolling = useRef(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const start = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON') return;

      if ('touches' in e) {
        touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      isScrolling.current = false;
      didLongPress.current = false;

      timer.current = setTimeout(() => {
        if (!isScrolling.current) {
          didLongPress.current = true;
          onLongPress();
        }
      }, delay);
    },
    [onLongPress, delay]
  );

  const cancel = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const end = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      cancel();
      if (!didLongPress.current && !isScrolling.current) {
        onTap?.();
      } else if (didLongPress.current) {
        // Prevent the synthetic click that follows touchEnd after a long-press
        e.preventDefault();
      }
    },
    [cancel, onTap]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStart.current) return;
      const dx = Math.abs(e.touches[0].clientX - touchStart.current.x);
      const dy = Math.abs(e.touches[0].clientY - touchStart.current.y);
      if (dx > SCROLL_THRESHOLD || dy > SCROLL_THRESHOLD) {
        isScrolling.current = true;
        cancel();
      }
    },
    [cancel]
  );

  return {
    onMouseDown: start as (e: React.MouseEvent) => void,
    onMouseUp: end as (e: React.MouseEvent) => void,
    onMouseLeave: cancel,
    onTouchStart: start as (e: React.TouchEvent) => void,
    onTouchEnd: end as (e: React.TouchEvent) => void,
    onTouchMove,
  };
}
