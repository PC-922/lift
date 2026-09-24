import React, { useMemo, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import type { Exercise, Workout } from '../../domain';
import { workoutEditorService } from '../../domain/WorkoutEditorService';
import { useTranslations } from '../utils/translations';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Modal } from './Modal';
import { WorkoutEntryEditor } from './WorkoutEntryEditor';

interface Props {
  initialWorkout: Workout;
  isNew: boolean;
  exercises: Exercise[];
  onSave(workout: Workout): Promise<void>;
  onDelete(): void;
  onClose(): void;
}

function toDateTimeLocal(iso: string): string {
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export const WorkoutEditorModal: React.FC<Props> = ({ initialWorkout, isNew, exercises, onSave, onDelete, onClose }) => {
  const t = useTranslations();
  const [workout, setWorkout] = useState(initialWorkout);
  const [isSaving, setIsSaving] = useState(false);
  const durationMinutes = Math.max(0, Math.round((Date.parse(workout.finishedAt) - Date.parse(workout.startedAt)) / 60_000));
  const availableExercises = useMemo(
    () => exercises.filter((exercise) => !workout.entries.some((entry) => entry.exerciseId === exercise.id)),
    [exercises, workout.entries]
  );

  const handleSave = async () => {
    if (!workout.name.trim()) return;
    setIsSaving(true);
    try {
      await onSave({ ...workout, name: workout.name.trim() });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} position="bottom" labelledBy="workout-editor-title">
      <div className="flex max-h-[calc(100dvh-1.5rem)] flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-app-border px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-app-text-muted">{t.labels.workoutHistory}</p>
            <h2 id="workout-editor-title" className="text-xl font-black text-app-text">
              {isNew ? t.labels.newWorkout : t.labels.workoutDetails}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-app-text-muted" aria-label={t.actions.close}>
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-app-text-muted">
              {t.labels.workoutName}
              <Input value={workout.name} onChange={(event) => setWorkout({ ...workout, name: event.target.value })} className="mt-1.5" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-semibold text-app-text-muted">
                {t.labels.startTime}
                <Input
                  type="datetime-local"
                  value={toDateTimeLocal(workout.startedAt)}
                  onChange={(event) => {
                    const next = new Date(event.target.value);
                    if (!Number.isNaN(next.getTime())) setWorkout(workoutEditorService.setStartedAt(workout, next.toISOString()));
                  }}
                  className="mt-1.5 px-2 text-sm"
                />
              </label>
              <label className="block text-xs font-semibold text-app-text-muted">
                {t.labels.durationMinutes}
                <Input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={durationMinutes}
                  onChange={(event) => setWorkout(workoutEditorService.setDuration(workout, Number(event.target.value)))}
                  className="mt-1.5 text-center tabular-nums"
                />
              </label>
            </div>
          </div>

          <div className="space-y-3">
            {workout.entries.map((entry, entryIndex) => (
              <WorkoutEntryEditor
                key={entry.blockId}
                entry={entry}
                entryIndex={entryIndex}
                exercises={exercises}
                onExerciseChange={(exerciseId) => setWorkout(workoutEditorService.replaceExercise(workout, entryIndex, exerciseId))}
                onRemoveExercise={() => setWorkout(workoutEditorService.removeExercise(workout, entryIndex))}
                onAddSet={() => setWorkout(workoutEditorService.addSet(workout, entryIndex))}
                onUpdateSet={(setIndex, set) => setWorkout(workoutEditorService.updateSet(workout, entryIndex, setIndex, set))}
                onRemoveSet={(setIndex) => setWorkout(workoutEditorService.removeSet(workout, entryIndex, setIndex))}
              />
            ))}

            {availableExercises.length > 0 && (
              <Select value="" onChange={(event) => setWorkout(workoutEditorService.addExercise(workout, event.target.value))}>
                <option value="" disabled>{t.labels.addExercise}</option>
                {availableExercises.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}
              </Select>
            )}
          </div>
        </div>

        <footer className="grid shrink-0 grid-cols-[auto_1fr] gap-3 border-t border-app-border bg-app-surface px-5 py-4">
          {!isNew && (
            <Button type="button" variant="ghost" onClick={onDelete} aria-label={t.actions.delete}>
              <Trash2 size={18} />
            </Button>
          )}
          <Button type="button" onClick={handleSave} disabled={!workout.name.trim() || isSaving} className={isNew ? 'col-span-2' : ''}>
            {t.actions.save}
          </Button>
        </footer>
      </div>
    </Modal>
  );
};
