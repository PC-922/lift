import React, { useState } from 'react';
import { ChevronRight, MoreVertical } from 'lucide-react';
import { Routine } from '../types';
import { useTranslations } from '../utils/translations';
import { ActionSheet, ActionSheetAction } from './ActionSheet';
import { ListRow } from './ui/ListRow';
import { IconButton } from './ui/IconButton';

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

  const totalExercises = routine.days.reduce((sum, day) => sum + day.exercises.length, 0);

  const actions: ActionSheetAction[] = [
    { label: t.actions.edit, onPress: onEdit },
    { label: t.actions.duplicate, onPress: onDuplicate },
    { label: t.labels.move, onPress: onMove },
    { label: t.actions.delete, destructive: true, onPress: onDelete },
  ];

  return (
    <>
      <ListRow className="select-none transition-colors active:bg-app-surface-muted">
        <div className="min-w-0 flex-1" onClick={onClick}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="break-words text-lg font-semibold text-app-text">{routine.name}</h3>
            <ChevronRight size={18} className="text-app-text-muted flex-shrink-0" />
          </div>
          <p className="mt-1 break-words text-xs text-app-text-muted">
            {totalExercises} {t.labels.exercises} · {routine.days.length} {t.labels.days}
          </p>
        </div>
        <IconButton
          onClick={(e) => { e.stopPropagation(); setShowActions(true); }}
          aria-label="Menu"
          className="shrink-0 -mr-2 self-start"
        >
          <MoreVertical size={18} />
        </IconButton>
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
