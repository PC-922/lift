import React, { useState } from 'react';
import { Play, Trash2 } from 'lucide-react';
import { useWorkoutSession } from '../hooks/useWorkoutSession';
import { useAppData } from '../hooks/useAppData';
import { useTranslations } from '../utils/translations';
import { Routine } from '../types';
import { WorkoutPlayer } from './WorkoutPlayer';
import { Button } from './ui/Button';
import { ListRow } from './ui/ListRow';
import { Modal } from './Modal';
import ConfirmModal from './ConfirmModal';

function formatDuration(startedAt: string, finishedAt: string): string {
  const total = Math.max(0, Math.floor((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export const WorkoutScreen: React.FC = () => {
  const t = useTranslations();
  const { activeWorkout, startWorkout } = useWorkoutSession();
  const { routines, workouts } = useAppData();

  if (activeWorkout) {
    return <WorkoutPlayer />;
  }

  const startFreeWorkout = () => {
    startWorkout({ name: t.labels.freeWorkout, exercises: [] });
  };

  const startRoutineDay = (routine: Routine, dayIndex: number) => {
    const day = routine.days[dayIndex];
    if (!day) return;
    startWorkout({
      name: `${routine.name} · ${day.name}`,
      routineId: routine.id,
      dayId: day.id,
      exercises: day.exercises.map((re) => ({
        exerciseId: re.exerciseId,
        target: { sets: re.sets, reps: re.reps, restSeconds: re.restSeconds },
      })),
    });
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="space-y-3">
        <Button
          onClick={startFreeWorkout}
          size="lg"
          className="w-full gap-2"
        >
          <Play size={20} strokeWidth={3} />
          {t.labels.freeWorkout}
        </Button>
        <p className="text-center text-sm text-app-text-muted">{t.labels.freeWorkoutDesc}</p>
      </div>

      <div className="space-y-3">
        <p className="ml-1 text-xs font-semibold uppercase tracking-wide text-app-text-muted">{t.labels.routines}</p>
        {routines.length === 0 ? (
          <p className="py-6 text-center text-sm text-app-text-muted">{t.labels.noRoutines}</p>
        ) : (
          <div className="space-y-3">
            {routines.map((routine) => (
              <RoutineStartCard
                key={routine.id}
                routine={routine}
                onStartDay={(dayIndex) => startRoutineDay(routine, dayIndex)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <p className="ml-1 text-xs font-semibold uppercase tracking-wide text-app-text-muted">{t.labels.workoutHistory}</p>
        {workouts.length === 0 ? (
          <div className="py-10 text-center opacity-60">
            <p className="font-medium text-app-text">{t.labels.noWorkouts}</p>
            <p className="mt-1 text-sm text-app-text-muted">{t.labels.noWorkoutsDesc}</p>
          </div>
        ) : (
          <WorkoutHistoryList />
        )}
      </div>
    </div>
  );
};

const RoutineStartCard: React.FC<{ routine: Routine; onStartDay: (dayIndex: number) => void }> = ({ routine, onStartDay }) => {
  const t = useTranslations();
  const [showDays, setShowDays] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowDays(true)}
        className="w-full rounded-2xl border border-app-border bg-app-surface p-4 text-left transition-colors active:bg-app-surface-muted"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-app-text">{routine.name}</p>
            <p className="mt-0.5 text-xs text-app-text-muted">
              {routine.days.length} {routine.days.length === 1 ? t.labels.day : t.labels.days}
            </p>
          </div>
          <span className="flex items-center gap-1 rounded-lg bg-app-accent px-3 py-2 text-xs font-bold text-app-accent-foreground">
            <Play size={14} />
            {t.actions.startWorkout}
          </span>
        </div>
      </button>

      <Modal open={showDays} onClose={() => setShowDays(false)} position="bottom">
        <div className="flex max-h-[70dvh] w-full flex-col">
          <div className="shrink-0 border-b border-app-border px-6 pb-4 pt-5">
            <h2 className="text-lg font-bold text-app-text">{routine.name}</h2>
            <p className="mt-1 text-sm text-app-text-muted">{t.labels.chooseDay}</p>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-2">
              {routine.days.map((day, index) => (
                <button
                  key={day.id}
                  onClick={() => {
                    setShowDays(false);
                    onStartDay(index);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-app-border bg-app-surface px-4 py-3.5 text-left transition-colors active:bg-app-surface-muted"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-app-text">{day.name}</p>
                    <p className="text-xs text-app-text-muted">
                      {day.exercises.length} {t.labels.exercises}
                    </p>
                  </div>
                  <Play size={18} className="shrink-0 text-app-accent-text" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

const WorkoutHistoryList: React.FC = () => {
  const t = useTranslations();
  const { workouts, deleteWorkout } = useAppData();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deletingWorkout = workouts.find((workout) => workout.id === deletingId) ?? null;

  return (
    <div className="space-y-3">
      {workouts.map((workout) => {
        const setCount = workout.entries.reduce((sum, entry) => sum + entry.sets.length, 0);
        return (
          <ListRow key={workout.id} padded={false}>
            <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-app-text">{workout.name}</p>
                <p className="mt-0.5 text-xs text-app-text-muted">
                  {formatDate(workout.startedAt)} · {workout.entries.length} {t.labels.exercises} · {setCount} {t.labels.setsCount}
                </p>
                <p className="mt-0.5 text-xs text-app-text-muted">
                  {t.labels.duration}: {formatDuration(workout.startedAt, workout.finishedAt)}
                </p>
              </div>
              <button
                onClick={() => setDeletingId(workout.id)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-app-text-muted active:text-app-danger"
                aria-label={t.actions.delete}
              >
                <Trash2 size={18} />
              </button>
            </div>
          </ListRow>
        );
      })}

      {deletingWorkout && (
        <ConfirmModal
          title={t.prompts.confirmDelete}
          confirmLabel={t.actions.delete}
          destructive
          onConfirm={async () => {
            await deleteWorkout(deletingWorkout.id);
            setDeletingId(null);
          }}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>
  );
};
