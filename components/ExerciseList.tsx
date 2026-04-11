import React, { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { Exercise } from '../types';
import { useTranslations, getTranslatedGroupName } from '../utils/translations';
import { useLongPress } from '../hooks/useLongPress';
import { ActionSheet } from './ActionSheet';

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
    <div
      {...handlers}
      className="bg-ios-card rounded-2xl p-4 flex items-center justify-between select-none cursor-pointer active:opacity-70"
    >
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-semibold text-ios-text truncate">{exercise.name}</h3>
        <p className="text-xs text-ios-gray mt-0.5 uppercase tracking-wide">
          {getTranslatedGroupName(exercise.muscleGroup)}
        </p>
      </div>
    </div>
  );
};

const GroupChip: React.FC<{
  group: string;
  active: boolean;
  onTap: () => void;
  onLongPress: () => void;
}> = ({ group, active, onTap, onLongPress }) => {
  const handlers = useLongPress({ onTap, onLongPress });
  return (
    <button
      {...handlers}
      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors select-none ${
        active ? 'bg-ios-blue text-white' : 'bg-ios-card text-ios-gray active:bg-ios-bg'
      }`}
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

  const filtered = useMemo(() => {
    return exercises
      .filter((ex) => {
        const matchesGroup = activeGroup ? ex.muscleGroup === activeGroup : true;
        const matchesSearch = search.trim()
          ? ex.name.toLowerCase().includes(search.toLowerCase())
          : true;
        return matchesGroup && matchesSearch;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [exercises, activeGroup, search]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ios-gray pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.labels.searchExercises}
          className="w-full bg-ios-card text-ios-text pl-9 pr-9 py-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-ios-blue text-sm"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ios-gray active:opacity-70"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          onClick={() => setActiveGroup(null)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            activeGroup === null
              ? 'bg-ios-blue text-white'
              : 'bg-ios-card text-ios-gray active:bg-ios-bg'
          }`}
        >
          {t.labels.allGroups}
        </button>
        {muscleGroups.map((g) => (
          <GroupChip
            key={g}
            group={g}
            active={activeGroup === g}
            onTap={() => setActiveGroup(activeGroup === g ? null : g)}
            onLongPress={() => setActionGroup(g)}
          />
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 opacity-50">
          <p className="text-ios-text font-medium">
            {search || activeGroup ? t.labels.noExercisesFound : t.labels.noExercises}
          </p>
          {!search && !activeGroup && (
            <p className="text-sm text-ios-gray mt-2">{t.labels.noExercisesDesc}</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ex) => (
            <ExerciseItem
              key={ex.id}
              exercise={ex}
              onSelect={() => onSelectExercise(ex)}
              onLongPress={() => setActionExercise(ex)}
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
