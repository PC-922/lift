import React, { useState, useRef, useCallback } from 'react';
import { ChevronRight } from 'lucide-react';
import { Routine } from '../types';
import { t } from '../utils/translations';
import { ActionSheet } from './ActionSheet';

interface Props {
  routine: Routine;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const LONG_PRESS_MS = 500;

export const RoutineCard: React.FC<Props> = ({ routine, onClick, onEdit, onDelete, onDuplicate }) => {
  const [showActions, setShowActions] = useState(false);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const startLongPress = useCallback(() => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setShowActions(true);
    }, LONG_PRESS_MS);
  }, []);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handlePress = useCallback((e?: React.TouchEvent | React.MouseEvent) => {
    e?.preventDefault();
    cancelLongPress();
    if (didLongPress.current) return;
    onClick();
  }, [cancelLongPress, onClick]);

  const actions = [
    { label: t.actions.edit, onPress: onEdit },
    { label: t.actions.duplicate, onPress: onDuplicate },
    { label: t.actions.delete, destructive: true, onPress: onDelete },
  ];

  return (
    <>
      <div
        className="rounded-2xl bg-ios-card overflow-hidden select-none active:bg-gray-50 dark:active:bg-gray-800 transition-colors"
        onTouchStart={startLongPress}
        onTouchEnd={handlePress}
        onTouchMove={cancelLongPress}
        onMouseDown={startLongPress}
        onMouseUp={handlePress}
        onMouseLeave={cancelLongPress}
      >
        <div className="p-4 flex justify-between items-center">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-ios-text truncate">{routine.name}</h3>
            <p className="text-xs text-ios-gray mt-1">
              {routine.exercises.length} {t.labels.exercises}
            </p>
          </div>
          <ChevronRight size={18} className="text-ios-gray ml-3 flex-shrink-0" />
        </div>
      </div>

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
