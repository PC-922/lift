import React, { useState } from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import type { Workout } from '../../domain';
import { useAppData } from '../hooks/useAppData';
import { useTranslations } from '../utils/translations';
import ConfirmModal from './ConfirmModal';
import { WorkoutEditorModal } from './WorkoutEditorModal';

function formatDuration(startedAt: string, finishedAt: string): string {
  const total = Math.max(0, Math.floor((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export const WorkoutHistory: React.FC = () => {
  const t = useTranslations();
  const { workouts, exercises, saveWorkout, deleteWorkout, createWorkoutDraft } = useAppData();
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [deletingWorkout, setDeletingWorkout] = useState<Workout | null>(null);
  const isNew = editingWorkout ? !workouts.some((workout) => workout.id === editingWorkout.id) : false;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="ml-1 text-xs font-semibold uppercase tracking-wide text-app-text-muted">{t.labels.workoutHistory}</p>
        <button
          type="button"
          onClick={() => setEditingWorkout(createWorkoutDraft())}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-app-accent-text active:opacity-70"
        >
          <Plus size={15} />
          {t.labels.newWorkout}
        </button>
      </div>

      {workouts.length === 0 ? (
        <div className="py-10 text-center opacity-60">
          <p className="font-medium text-app-text">{t.labels.noWorkouts}</p>
          <p className="mt-1 text-sm text-app-text-muted">{t.labels.noWorkoutsDesc}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {workouts.map((workout) => {
            const setCount = workout.entries.reduce((sum, entry) => sum + entry.sets.length, 0);
            return (
              <button
                key={workout.id}
                type="button"
                onClick={() => setEditingWorkout(workout)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-app-border bg-app-surface px-4 py-4 text-left transition-colors active:bg-app-surface-muted sm:px-5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-app-text">{workout.name}</p>
                  <p className="mt-0.5 text-xs text-app-text-muted">
                    {formatDate(workout.startedAt)} · {workout.entries.length} {t.labels.exercises} · {setCount} {t.labels.setsCount}
                  </p>
                  <p className="mt-0.5 text-xs text-app-text-muted">
                    {t.labels.duration}: {formatDuration(workout.startedAt, workout.finishedAt)}
                  </p>
                </div>
                <ChevronRight size={18} className="shrink-0 text-app-text-muted" />
              </button>
            );
          })}
        </div>
      )}

      {editingWorkout && (
        <WorkoutEditorModal
          initialWorkout={editingWorkout}
          isNew={isNew}
          exercises={exercises}
          onSave={async (workout) => {
            await saveWorkout(workout);
            setEditingWorkout(null);
          }}
          onDelete={() => setDeletingWorkout(editingWorkout)}
          onClose={() => setEditingWorkout(null)}
        />
      )}

      {deletingWorkout && (
        <ConfirmModal
          title={t.prompts.deleteWorkout.replace('{name}', deletingWorkout.name)}
          confirmLabel={t.actions.delete}
          destructive
          onConfirm={async () => {
            await deleteWorkout(deletingWorkout.id);
            setDeletingWorkout(null);
            setEditingWorkout(null);
          }}
          onCancel={() => setDeletingWorkout(null)}
        />
      )}
    </div>
  );
};
