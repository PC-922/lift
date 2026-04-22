import React, { useState } from 'react';
import { ArrowUp, ArrowDown, ChevronRight } from 'lucide-react';
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
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export const RoutineCard: React.FC<Props> = ({ routine, onClick, onEdit, onDelete, onDuplicate, onMoveUp, onMoveDown, isFirst, isLast }) => {
  const t = useTranslations();
  const [showActions, setShowActions] = useState(false);

  const handlers = useLongPress({
    onLongPress: () => setShowActions(true),
    onTap: onClick,
  });

  const actions: ActionSheetAction[] = [
    { label: t.actions.edit, onPress: onEdit },
    { label: t.actions.duplicate, onPress: onDuplicate },
    ...(!isFirst ? [{ label: t.labels.moveUp, icon: <ArrowUp size={16} />, keepOpen: true, onPress: onMoveUp }] : []),
    ...(!isLast ? [{ label: t.labels.moveDown, icon: <ArrowDown size={16} />, keepOpen: true, onPress: onMoveDown }] : []),
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
