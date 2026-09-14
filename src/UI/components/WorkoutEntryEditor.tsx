import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Exercise, WorkoutEntry, WorkoutSet } from '../../domain';
import { useTranslations } from '../utils/translations';
import { parseDecimalInput, parseIntegerInput } from '../utils/numberInput';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';

interface Props {
  entry: WorkoutEntry;
  entryIndex: number;
  exercises: Exercise[];
  onExerciseChange(exerciseId: string): void;
  onRemoveExercise(): void;
  onAddSet(): void;
  onUpdateSet(setIndex: number, set: WorkoutSet): void;
  onRemoveSet(setIndex: number): void;
}

export const WorkoutEntryEditor: React.FC<Props> = ({
  entry,
  entryIndex,
  exercises,
  onExerciseChange,
  onRemoveExercise,
  onAddSet,
  onUpdateSet,
  onRemoveSet,
}) => {
  const t = useTranslations();

  return (
    <section className="rounded-2xl border border-app-border bg-app-surface-muted p-3">
      <div className="flex items-center gap-2">
        <Select
          value={entry.exerciseId}
          onChange={(event) => onExerciseChange(event.target.value)}
          compact
          aria-label={`${t.labels.exercise} ${entryIndex + 1}`}
          className="font-semibold"
        >
          {exercises.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}
        </Select>
        <button
          type="button"
          onClick={onRemoveExercise}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-app-text-muted active:text-app-danger"
          aria-label={t.labels.removeExercise}
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {entry.sets.map((set, setIndex) => (
          <div key={setIndex} className="grid grid-cols-[1.5rem_1fr_1fr_2.5rem] items-end gap-2">
            <span className="pb-2.5 text-center text-xs font-bold text-app-text-muted">{setIndex + 1}</span>
            <Input
              compact
              type="number"
              inputMode="decimal"
              step="any"
              value={set.weight ?? ''}
              onChange={(event) => onUpdateSet(setIndex, { ...set, weight: parseDecimalInput(event.target.value) })}
              aria-label={`${t.labels.weight} ${setIndex + 1}`}
              placeholder={t.labels.weightShort}
              className="text-center tabular-nums"
            />
            <Input
              compact
              type="number"
              inputMode="numeric"
              step="1"
              value={set.reps ?? ''}
              onChange={(event) => onUpdateSet(setIndex, { ...set, reps: parseIntegerInput(event.target.value) })}
              aria-label={`${t.labels.reps} ${setIndex + 1}`}
              placeholder={t.labels.reps}
              className="text-center tabular-nums"
            />
            <button
              type="button"
              onClick={() => onRemoveSet(setIndex)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-app-text-muted active:text-app-danger"
              aria-label={`${t.labels.removeSet} ${setIndex + 1}`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {entry.sets.length === 0 && <p className="py-2 text-center text-xs text-app-text-muted">{t.labels.noSets}</p>}
      </div>

      <Button type="button" variant="ghost" size="sm" onClick={onAddSet} className="mt-2 w-full">
        <Plus size={16} />
        {t.labels.addSet}
      </Button>
    </section>
  );
};
