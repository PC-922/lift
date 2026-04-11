import React, { useState, useRef, useCallback } from 'react';
import { ChevronRight } from 'lucide-react';
import { Routine } from '../types';
import { useTranslations } from '../utils/translations';
import { ActionSheet } from './ActionSheet';
import { Surface } from './ui/Surface';

interface Props {
  routine: Routine;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const LONG_PRESS_MS = 500;

export const RoutineCard: React.FC<Props> = ({ routine, onClick, onEdit, onDelete, onDuplicate }) => {
  const t = useTranslations();
  const [showActions, setShowActions] = useState(false);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const isScrolling = useRef(false);

  const startLongPress = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if ('touches' in e) {
      touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    isScrolling.current = false;
    didLongPress.current = false;

    longPressTimer.current = setTimeout(() => {
      if (!isScrolling.current) {
        didLongPress.current = true;
        setShowActions(true);
      }
    }, LONG_PRESS_MS);
  }, []);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    const dx = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
    
    if (dx > 10 || dy > 10) {
      isScrolling.current = true;
      cancelLongPress();
    }
  }, [cancelLongPress]);

  const handlePress = useCallback((e?: React.TouchEvent | React.MouseEvent) => {
    e?.preventDefault();
    cancelLongPress();
    if (didLongPress.current || isScrolling.current) return;
    onClick();
  }, [cancelLongPress, onClick]);

  const actions = [
    { label: t.actions.edit, onPress: onEdit },
    { label: t.actions.duplicate, onPress: onDuplicate },
    { label: t.actions.delete, destructive: true, onPress: onDelete },
  ];

  return (
    <>
      <Surface
        className="overflow-hidden select-none transition-colors active:bg-app-surface-muted"
        onTouchStart={startLongPress}
        onTouchEnd={handlePress}
        onTouchMove={handleTouchMove}
        onMouseDown={startLongPress}
        onMouseUp={handlePress}
        onMouseLeave={cancelLongPress}
      >
        <div className="p-4 flex justify-between items-center">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-app-text truncate">{routine.name}</h3>
            <p className="text-xs text-app-text-muted mt-1">
              {routine.exercises.length} {t.labels.exercises}
            </p>
          </div>
          <ChevronRight size={18} className="text-app-text-muted ml-3 flex-shrink-0" />
        </div>
      </Surface>

      {showActions && (
        <ActionSheet
          title={routine.name}
          actions={actions}
          onClose={() => setShowActions(false)}
        />
      )}
    </>
  );
};
