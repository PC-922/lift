import React, { useEffect, useMemo, useState } from 'react';
import { Exercise } from '../types';
import { useTranslations, getTranslatedGroupName } from '../utils/translations';
import { useLongPress } from '../hooks/useLongPress';
import { ActionSheet } from './ActionSheet';
import { SearchInput } from './ui/SearchInput';
import { Surface } from './ui/Surface';
import { cn } from '../utils/cn';

interface Props {
  exercises: Exercise[];
  muscleGroups: string[];
  onSelectExercise: (exercise: Exercise) => void;
  onRename: (exercise: Exercise) => void;
  onDelete: (exercise: Exercise) => void;
  onMove: (exercise: Exercise) => void;
  onRenameGroup: (group: string) => void;
  onDeleteGroup: (group: string) => void;
}

const ExerciseItem: React.FC<{
  exercise: Exercise;
  onSelect: () => void;
  onLongPress: () => void;
}> = ({ exercise, onSelect, onLongPress }) => {
  const handlers = useLongPress({ onLongPress, onTap: onSelect });

  return (
    <Surface {...handlers} className="cursor-pointer select-none active:bg-app-surface-muted">
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-app-text">{exercise.name}</h3>
        <p className="mt-0.5 text-xs uppercase tracking-wide text-app-text-muted">
          {getTranslatedGroupName(exercise.muscleGroup)}
        </p>
      </div>
    </Surface>
  );
};

const GroupChip: React.FC<{
  group: string;
  active: boolean;
  onTap: () => void;
  onLongPress: () => void;
}> = ({ group, active, onTap, onLongPress }) => {
  const { onTouchStart, onTouchEnd, onTouchMove, onMouseDown, onMouseUp, onMouseLeave } = useLongPress({ onLongPress });

  return (
    <button
      onClick={onTap}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchMove={onTouchMove}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      className={cn(
        'flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors select-none',
        active
          ? 'border-app-accent bg-app-accent text-app-accent-foreground'
          : 'border-app-border bg-app-surface text-app-text-muted active:bg-app-surface-muted'
      )}
    >
      {getTranslatedGroupName(group)}
    </button>
  );
};

export const ExerciseList: React.FC<Props> = ({
  exercises,
  muscleGroups,
  onSelectExercise,
  onRename,
  onDelete,
  onMove,
  onRenameGroup,
  onDeleteGroup,
}) => {
  const t = useTranslations();
  const [search, setSearch] = useState('');
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [actionExercise, setActionExercise] = useState<Exercise | null>(null);
  const [actionGroup, setActionGroup] = useState<string | null>(null);

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

  useEffect(() => {
    if (activeGroup && !muscleGroups.includes(activeGroup)) {
      setActiveGroup(null);
    }
  }, [activeGroup, muscleGroups]);

  return (
    <div className="space-y-4">
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
              'flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors select-none',
              activeGroup === null
                ? 'border-app-accent bg-app-accent text-app-accent-foreground'
                : 'border-app-border bg-app-surface text-app-text-muted active:bg-app-surface-muted'
            )}
          >
            {t.labels.allGroups}
          </button>

          {muscleGroups.map((group) => (
            <GroupChip
              key={group}
              group={group}
              active={activeGroup === group}
              onTap={() => setActiveGroup((current) => (current === group ? null : group))}
              onLongPress={() => setActionGroup(group)}
            />
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
              onLongPress={() => setActionExercise(exercise)}
            />
          ))}
        </div>
      )}

      {actionExercise && (
        <ActionSheet
          title={actionExercise.name}
          subtitle={getTranslatedGroupName(actionExercise.muscleGroup)}
          actions={[
            { label: t.actions.rename, onPress: () => onRename(actionExercise) },
            { label: t.actions.move, onPress: () => onMove(actionExercise) },
            { label: t.actions.delete, destructive: true, onPress: () => onDelete(actionExercise) },
          ]}
          onClose={() => setActionExercise(null)}
        />
      )}

      {actionGroup && (
        <ActionSheet
          title={getTranslatedGroupName(actionGroup)}
          actions={[
            { label: t.actions.rename, onPress: () => onRenameGroup(actionGroup) },
            { label: t.actions.delete, destructive: true, onPress: () => onDeleteGroup(actionGroup) },
          ]}
          onClose={() => setActionGroup(null)}
        />
      )}
    </div>
  );
};
