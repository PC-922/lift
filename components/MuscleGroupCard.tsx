import React, { useState, useRef, useCallback } from 'react';
import { ChevronRight } from 'lucide-react';
import { t, translations } from '../utils/translations';
import { ActionSheet } from './ActionSheet';

interface Props {
  group: string;
  count: number;
  onClick: () => void;
  onDelete: () => void;
  onRename: () => void;
}

const LONG_PRESS_MS = 500;

export const MuscleGroupCard: React.FC<Props> = ({ group, count, onClick, onDelete, onRename }) => {
  const [showActions, setShowActions] = useState(false);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const displayName = (translations.es.muscleGroups as Record<string, string>)[group]
    ? (t.muscleGroups as Record<string, string>)[group]
    : group;

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
    { label: t.actions.rename, onPress: onRename },
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
          <div className="flex items-center gap-4">
            <div className="bg-ios-bg w-10 h-10 rounded-full flex items-center justify-center">
              <span className="text-lg font-bold text-ios-blue">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-ios-text">{displayName}</h3>
              <p className="text-xs text-ios-gray">
                {count} {t.labels.exercises}
              </p>
            </div>
          </div>
          <ChevronRight className="text-ios-gray/50" size={20} />
        </div>
      </div>

      {showActions && (
        <ActionSheet
          title={displayName}
          actions={actions}
          onClose={() => setShowActions(false)}
        />
      )}
    </>
  );
};
