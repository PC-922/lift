import React, { useState } from 'react';
import { Play } from 'lucide-react';
import { useWorkoutSession } from '../hooks/useWorkoutSession';
import { useAppData } from '../hooks/useAppData';
import { useTranslations } from '../utils/translations';
import { Routine } from '../../domain';
import { WorkoutPlayer } from './WorkoutPlayer';
import { Button } from './ui/Button';
import { Modal } from './Modal';
import { WorkoutHistory } from './WorkoutHistory';

export const WorkoutScreen: React.FC = () => {
  const t = useTranslations();
  const { activeWorkout, startWorkout } = useWorkoutSession();
  const { routines, exercises } = useAppData();

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
        blockId: re.blockId,
        exerciseId: re.exerciseId,
        exerciseName: exercises.find((exercise) => exercise.id === re.exerciseId)?.name,
        target: { sets: re.sets, reps: re.reps, restSeconds: re.restSeconds },
      })),
    });
  };

  return (
    <div className="space-y-6">
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

      <WorkoutHistory />
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
