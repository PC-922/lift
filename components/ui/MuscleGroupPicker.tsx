import React from 'react';
import { getTranslatedGroupName } from '../../utils/translations';
import { cn } from '../../utils/cn';

interface Props {
  groups: string[];
  selected: string;
  onSelect: (group: string) => void;
  excludeSelected?: boolean;
  maxHeightClass?: string;
}

export const MuscleGroupPicker: React.FC<Props> = ({
  groups,
  selected,
  onSelect,
  excludeSelected = false,
  maxHeightClass = 'max-h-[50vh]',
}) => {
  const filteredGroups = excludeSelected ? groups.filter((g) => g !== selected) : groups;

  return (
    <div className={cn('grid grid-cols-3 gap-2 mb-4 overflow-y-auto', maxHeightClass)}>
      {filteredGroups.map((group) => (
        <button
          key={group}
          type="button"
          onClick={() => onSelect(group)}
          className={cn(
            'truncate rounded-lg border px-1 py-2 text-sm font-medium transition-colors',
            group === selected
              ? 'border-app-accent bg-app-accent text-app-accent-foreground'
              : 'border-app-border bg-app-surface text-app-text active:bg-app-surface-muted'
          )}
        >
          {getTranslatedGroupName(group)}
        </button>
      ))}
    </div>
  );
};
