import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Routine } from '../types';
import { useTranslations } from '../utils/translations';
import { useLongPress } from '../hooks/useLongPress';
import { ActionSheet, ActionSheetAction } from './ActionSheet';
import { ListRow } from './ui/ListRow';

interface Props {
  routine: Routine;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: () => void;
}

export const RoutineCard: React.FC<Props> = ({ routine, onClick, onEdit, onDelete, onDuplicate, onMove }) => {
  const t = useTranslations();
  const [showActions, setShowActions] = useState(false);

  const handlers = useLongPress({
    onLongPress: () => setShowActions(true),
    onTap: onClick,
  });

  const actions: ActionSheetAction[] = [
    { label: t.actions.edit, onPress: onEdit },
    { label: t.actions.duplicate, onPress: onDuplicate },
    { label: t.labels.move, onPress: onMove },
    { label: t.actions.delete, destructive: true, onPress: onDelete },
  ];

  return (
    <>
      <ListRow
        className="select-none transition-colors active:bg-app-surface-muted"
        {...handlers}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-app-text">{routine.name}</h3>
            <p className="text-xs text-app-text-muted mt-1">
              {routine.exercises.length} {t.labels.exercises}
            </p>
          </div>
          <ChevronRight size={18} className="text-app-text-muted ml-3 flex-shrink-0" />
        </div>
      </ListRow>

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
