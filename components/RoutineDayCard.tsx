import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useTranslations, getTranslatedGroupName } from '../utils/translations';
import { Badge } from './ui/Badge';
import { ListRow } from './ui/ListRow';

interface Props {
  name: string;
  exerciseCount: number;
  muscleGroups: string[];
  onClick: () => void;
}

export const RoutineDayCard: React.FC<Props> = ({ name, exerciseCount, muscleGroups, onClick }) => {
  const t = useTranslations();

  return (
    <ListRow className="select-none transition-colors active:bg-app-surface-muted" onClick={onClick}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <h3 className="break-words text-base font-semibold text-app-text">{name}</h3>
          <ChevronRight size={18} className="text-app-text-muted flex-shrink-0" />
        </div>
        <p className="mt-1 text-xs text-app-text-muted">
          {exerciseCount} {t.labels.exercises}
        </p>
        {muscleGroups.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1" title={muscleGroups.map(getTranslatedGroupName).join(', ')}>
            {muscleGroups.slice(0, 4).map((group) => (
              <Badge key={group} variant="neutral" className="text-[10px] px-1.5 py-0.5">
                {getTranslatedGroupName(group)}
              </Badge>
            ))}
            {muscleGroups.length > 4 && (
              <Badge variant="neutral" className="text-[10px] px-1.5 py-0.5">
                +{muscleGroups.length - 4}
              </Badge>
            )}
          </div>
        )}
      </div>
    </ListRow>
  );
};
