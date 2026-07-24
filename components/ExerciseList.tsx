import React, { useMemo, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { Exercise } from '../types';
import { useTranslations, getTranslatedGroupName } from '../utils/translations';
import { ActionSheet } from './ActionSheet';
import { SearchInput } from './ui/SearchInput';
import { Surface } from './ui/Surface';
import { IconButton } from './ui/IconButton';
import { cn } from '../utils/cn';

interface Props {
  exercises: Exercise[];
  muscleGroups: string[];
  search?: string;
  activeGroup?: string | null;
  onSearchChange?: (value: string) => void;
  onActiveGroupChange?: (group: string | null) => void;
  onSelectExercise: (exercise: Exercise) => void;
  onEdit: (exercise: Exercise) => void;
  onDelete: (exercise: Exercise) => void;
}

const ExerciseItem: React.FC<{
  exercise: Exercise;
  onSelect: () => void;
  onMenu: () => void;
}> = ({ exercise, onSelect, onMenu }) => {
  return (
    <Surface
      className="cursor-pointer select-none active:bg-app-surface-muted border-none p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1" onClick={onSelect}>
          <h3 className="break-words text-lg font-bold leading-tight text-app-text">{exercise.name}</h3>
          <p className="mt-1 break-words text-xs font-bold uppercase tracking-widest text-app-text-muted/80">
            {getTranslatedGroupName(exercise.muscleGroup)}
          </p>
        </div>
        <IconButton
          onClick={(e) => { e.stopPropagation(); onMenu(); }}
          aria-label="Menu"
          className="shrink-0 -mr-2 -mt-2"
        >
          <MoreVertical size={18} />
        </IconButton>
      </div>
    </Surface>
  );
};

export const ExerciseList: React.FC<Props> = ({
  exercises,
  muscleGroups,
  search: controlledSearch,
  activeGroup: controlledActiveGroup,
  onSearchChange,
  onActiveGroupChange,
  onSelectExercise,
  onEdit,
  onDelete,
}) => {
  const t = useTranslations();
  const isControlled = controlledSearch !== undefined && controlledActiveGroup !== undefined;

  const [internalSearch, setInternalSearch] = useState('');
  const [internalActiveGroup, setInternalActiveGroup] = useState<string | null>(null);
  const [actionExercise, setActionExercise] = useState<Exercise | null>(null);

  const search = isControlled ? controlledSearch : internalSearch;
  const activeGroup = isControlled ? controlledActiveGroup : internalActiveGroup;

  const setSearch = (value: string) => {
    if (isControlled) {
      onSearchChange?.(value);
    } else {
      setInternalSearch(value);
    }
  };

  const setActiveGroup = (group: string | null) => {
    if (isControlled) {
      onActiveGroupChange?.(group);
    } else {
      setInternalActiveGroup(group);
    }
  };

  const filtered = useMemo(
    () =>
      exercises
        .filter((ex) => {
          const matchesGroup = activeGroup ? ex.muscleGroup === activeGroup : true;
          const matchesSearch = search.trim() ? ex.name.toLowerCase().includes(search.toLowerCase()) : true;
          return matchesGroup && matchesSearch;
        })
        .sort((a, b) => a.name.localeCompare(b.name)),
    [exercises, activeGroup, search]
  );

  return (
    <div className="space-y-4 pb-32">
      <SearchInput
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onClear={() => setSearch('')}
        placeholder={t.labels.searchExercises}
      />

      {muscleGroups.length > 0 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => setActiveGroup(null)}
            className={cn(
              'flex-shrink-0 rounded-full border-2 px-4 py-2 text-xs font-bold transition-all select-none',
              activeGroup === null
                ? 'border-app-accent bg-app-accent text-app-accent-foreground scale-105'
                : 'border-app-border bg-app-surface text-app-text-muted active:scale-95'
            )}
          >
            {t.labels.allGroups}
          </button>

          {muscleGroups.map((group) => (
            <button
              key={group}
              onClick={() => setActiveGroup(activeGroup === group ? null : group)}
              className={cn(
                'flex-shrink-0 rounded-full border-2 px-4 py-2 text-xs font-bold transition-all select-none',
                activeGroup === group
                  ? 'border-app-accent bg-app-accent text-app-accent-foreground scale-105'
                  : 'border-app-border bg-app-surface text-app-text-muted active:scale-95'
              )}
            >
              {getTranslatedGroupName(group)}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="py-20 text-center opacity-60">
          <p className="font-medium text-app-text">
            {search || activeGroup ? t.labels.noExercisesFound : t.labels.noExercises}
          </p>
          {!search && !activeGroup && <p className="mt-2 text-sm text-app-text-muted">{t.labels.noExercisesDesc}</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((exercise) => (
            <ExerciseItem
              key={exercise.id}
              exercise={exercise}
              onSelect={() => onSelectExercise(exercise)}
              onMenu={() => setActionExercise(exercise)}
            />
          ))}
        </div>
      )}

      {actionExercise && (
        <ActionSheet
          title={actionExercise.name}
          subtitle={getTranslatedGroupName(actionExercise.muscleGroup)}
          actions={[
            { label: t.actions.edit, onPress: () => { onEdit(actionExercise); setActionExercise(null); } },
            { label: t.actions.delete, destructive: true, onPress: () => { onDelete(actionExercise); setActionExercise(null); } },
          ]}
          onClose={() => setActionExercise(null)}
        />
      )}
    </div>
  );
};
