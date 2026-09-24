import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, ChevronLeft, ChevronRight, Clock, Plus, Trash2, X } from 'lucide-react';
import type { WorkoutSet } from '../../domain';
import { useWorkoutSession } from '../hooks/useWorkoutSession';
import { useAppData } from '../hooks/useAppData';
import { useRestTimer } from '../hooks/useRestTimer';
import { useToast } from '../hooks/useToast';
import { useWakeLock } from '../hooks/useWakeLock';
import { useTranslations, getTranslatedGroupName } from '../utils/translations';
import { getLatestLog, getLogFeedback } from '../utils/progression';
import { Exercise } from '../../domain';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Input } from './ui/Input';
import { Modal } from './Modal';
import ConfirmModal from './ConfirmModal';
import { SearchInput } from './ui/SearchInput';
import { cn } from '../utils/cn';
import { isDecimalInput, isIntegerInput, parseDecimalInput, parseIntegerInput } from '../utils/numberInput';

function formatElapsed(startedAt: string, now: number): string {
  const total = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export const WorkoutPlayer: React.FC = () => {
  const t = useTranslations();
  const { showToast } = useToast();
  const { exercises, finishWorkout } = useAppData();
  const {
    activeWorkout,
    currentIndex,
    logSet,
    removeSet,
    restoreSet,
    nextExercise,
    prevExercise,
    addExercise,
    replaceCurrentExercise,
    finish,
    cancel,
  } = useWorkoutSession();
  const { selectDuration, startTimer, stopTimer, remainingTime, isActive, clearTimer } = useRestTimer();

  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [showSummary, setShowSummary] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [exercisePickerMode, setExercisePickerMode] = useState<'add' | 'replace'>('add');
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [removedSet, setRemovedSet] = useState<{ exerciseIndex: number; setIndex: number; set: WorkoutSet } | null>(null);

  useWakeLock(!!activeWorkout);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!removedSet) return;
    const timeout = window.setTimeout(() => setRemovedSet(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [removedSet]);

  const activeExercise = activeWorkout?.exercises[currentIndex] ?? null;
  const exerciseById = useMemo(() => new Map(exercises.map((e) => [e.id, e] as const)), [exercises]);
  const exercise: Exercise | null = activeExercise ? exerciseById.get(activeExercise.exerciseId) ?? null : null;

  useEffect(() => {
    if (!activeExercise) return;
    const lastSet = activeExercise.sets[activeExercise.sets.length - 1];
    const latestLog = exercise ? getLatestLog(exercise.logs) : null;
    setWeight(lastSet ? (lastSet.weight?.toString() ?? '') : (latestLog?.weight?.toString() ?? ''));
    setReps(lastSet ? (lastSet.reps?.toString() ?? '') : (latestLog?.reps?.toString() ?? ''));
  }, [activeExercise, exercise]);

  const openExercisePicker = (mode: 'add' | 'replace') => {
    setExercisePickerMode(mode);
    setShowAddExercise(true);
  };

  const closeExercisePicker = () => {
    setShowAddExercise(false);
    setExerciseSearch('');
  };

  const handleExerciseSelected = (exerciseId: string) => {
    const exerciseName = exerciseById.get(exerciseId)?.name;
    if (exercisePickerMode === 'replace') {
      replaceCurrentExercise(exerciseId, exerciseName);
    } else {
      addExercise(exerciseId, undefined, exerciseName);
    }
    closeExercisePicker();
  };

  if (!activeWorkout || !activeExercise) {
    return (
      <div className="fixed inset-0 z-50 flex h-[100dvh] flex-col bg-app-bg pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        <div className="flex w-full items-center justify-between px-5 pb-4 pt-5 sm:mx-auto sm:max-w-md">
          <h1 className="text-xl font-bold text-app-text">{activeWorkout?.name || t.labels.freeWorkout}</h1>
          <button
            onClick={() => setShowDiscardConfirm(true)}
            className="rounded-full border border-app-border p-2 text-app-text-muted active:opacity-70"
            aria-label={t.actions.close}
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex w-full flex-1 flex-col items-center justify-center gap-4 px-6 text-center sm:mx-auto sm:max-w-md">
          <p className="text-app-text-muted">{t.labels.noExercises}</p>
          <Button onClick={() => openExercisePicker('add')}>
            <Plus size={18} />
            {t.labels.addExercise}
          </Button>
        </div>

        {showAddExercise && (
          <AddExerciseModal
            search={exerciseSearch}
            onSearchChange={setExerciseSearch}
            title={exercisePickerMode === 'replace' ? t.labels.changeExercise : t.labels.addExercise}
            onSelect={handleExerciseSelected}
            onClose={closeExercisePicker}
          />
        )}
        {showDiscardConfirm && (
          <ConfirmModal
            title={t.labels.discardWorkout}
            message={t.labels.discardWorkoutConfirm}
            confirmLabel={t.actions.delete}
            destructive
            onConfirm={() => {
              cancel();
              clearTimer();
              setShowDiscardConfirm(false);
            }}
            onCancel={() => setShowDiscardConfirm(false)}
          />
        )}
      </div>
    );
  }

  const target = activeExercise.target;
  const doneSets = activeExercise.sets.length;
  const targetSets = target?.sets ?? doneSets;
  const restSeconds = target?.restSeconds && target.restSeconds > 0 ? target.restSeconds : 90;

  const handleLogSet = () => {
    if (!activeExercise) return;
    const weightValue = parseDecimalInput(weight);
    const repsValue = parseIntegerInput(reps);
    if (weightValue === null && repsValue === null) return;

    const latestLog = exercise ? getLatestLog(exercise.logs) : null;
    const isFirst = (exercise?.logs ?? []).length === 0;
    const feedback = getLogFeedback(
      weightValue,
      repsValue,
      latestLog?.weight ?? null,
      latestLog?.reps ?? null,
      isFirst
    );

    logSet(weightValue, repsValue);
    setWeight(weightValue?.toString() ?? '');
    setReps(repsValue?.toString() ?? '');

    selectDuration(restSeconds);
    startTimer();

    if (!feedback) return;
    if (feedback.type === 'first') {
      showToast(t.labels.firstLog, 'achievement');
    } else if (feedback.type === 'progress') {
      showToast(
        feedback.kind === 'reps' ? t.labels.newRepsRecord : t.labels.newWeightRecord,
        'achievement'
      );
    } else {
      showToast(t.labels.regressionRecord, 'regression');
    }
  };

  const handleRemoveSet = (setIndex: number) => {
    const set = activeExercise?.sets[setIndex];
    if (!set) return;
    removeSet(currentIndex, setIndex);
    setRemovedSet({ exerciseIndex: currentIndex, setIndex, set });
  };

  const handleUndoRemoveSet = () => {
    if (!removedSet) return;
    restoreSet(removedSet.exerciseIndex, removedSet.setIndex, removedSet.set);
    setRemovedSet(null);
  };

  const handleFinish = async () => {
    const workout = finish();
    if (!workout) return;
    await finishWorkout(workout);
    clearTimer();
    showToast(t.labels.workoutSaved, 'achievement');
    setShowSummary(false);
  };

  const handleDiscardConfirm = () => {
    cancel();
    clearTimer();
    setShowDiscardConfirm(false);
  };

  const isLast = currentIndex === activeWorkout.exercises.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex h-[100dvh] flex-col bg-app-bg pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <header className="flex w-full items-center justify-between px-5 pb-4 pt-5 sm:mx-auto sm:max-w-md">
        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-app-text">{activeWorkout.name || t.labels.freeWorkout}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-app-text-muted">
            <Clock size={12} />
            {formatElapsed(activeWorkout.startedAt, now)}
          </p>
        </div>
        <button
          onClick={() => setShowDiscardConfirm(true)}
          className="rounded-full border border-app-border p-2 text-app-text-muted active:opacity-70"
          aria-label={t.actions.close}
        >
          <X size={18} />
        </button>
      </header>

      <div className="flex w-full items-center gap-2 px-5 pb-2 sm:mx-auto sm:max-w-md">
        {activeWorkout.exercises.map((item, index) => (
          <span
            key={item.blockId}
            aria-hidden="true"
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              index < currentIndex ? 'bg-app-accent'
              : index === currentIndex ? 'bg-app-text'
              : 'bg-app-border'
            )}
          />
        ))}
      </div>

      {remainingTime > 0 ? (
        <div className="flex w-full flex-1 flex-col items-center justify-center gap-6 px-6 sm:mx-auto sm:max-w-md">
          <p className="text-xs font-semibold uppercase tracking-widest text-app-text-muted">{t.labels.rest}</p>
          <p className="text-7xl font-black tabular-nums text-app-text">
            {Math.floor(remainingTime / 60)}:{String(remainingTime % 60).padStart(2, '0')}
          </p>
          <Button variant="secondary" onClick={isActive ? stopTimer : startTimer}>
            {isActive ? t.labels.restPause : t.labels.restResume}
          </Button>
          <Button variant="ghost" onClick={clearTimer}>
            {t.labels.restSkip}
          </Button>
        </div>
      ) : (
        <div className="flex min-h-0 w-full flex-1 flex-col px-5 sm:mx-auto sm:max-w-md">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mb-4 min-h-[6.5rem]">
              <h2 className="line-clamp-2 text-3xl font-black leading-tight text-app-text">
                {exercise?.name ?? activeExercise.exerciseName ?? t.labels.deletedExercise}
              </h2>
              <p className="mt-1 text-xs font-bold uppercase tracking-widest text-app-text-muted">
                {exercise ? getTranslatedGroupName(exercise.muscleGroup) : ''}
              </p>
            </div>

            <div className="mb-4 flex min-h-8 items-center gap-2">
              {target && (
                <>
                  <Badge variant="accent" className="text-sm font-bold">
                    {t.labels.sets}: {targetSets}
                  </Badge>
                  <Badge variant="neutral" className="text-sm font-bold">
                    {t.labels.reps}: {target.reps || '—'}
                  </Badge>
                </>
              )}
            </div>

            <div className="mb-6 flex min-h-9 flex-wrap content-start gap-2">
              {activeExercise.sets.map((set, index) => (
                <div key={index} className="flex items-center rounded-lg border border-app-border bg-app-surface-muted text-xs font-semibold tabular-nums text-app-text">
                  <span className="px-2.5 py-1.5">{set.weight ?? '—'} × {set.reps ?? '—'}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSet(index)}
                    className="self-stretch border-l border-app-border px-2 text-app-text-muted active:bg-app-surface"
                    aria-label={`${t.labels.removeSet} ${index + 1}`}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              ))}
              {Array.from({ length: Math.max(0, targetSets - doneSets) }).map((_, index) => (
                <span key={`empty-${index}`} className="rounded-lg border border-dashed border-app-border px-2.5 py-1.5 text-xs text-app-text-muted">
                  •
                </span>
              ))}
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-app-text-muted">{t.labels.weight}</label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={weight}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (isDecimalInput(value)) setWeight(value);
                    }}
                    placeholder="0"
                    className="text-center text-2xl font-black tabular-nums"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-app-text-muted">{t.labels.reps}</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={reps}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (isIntegerInput(value)) setReps(value);
                    }}
                    placeholder="0"
                    className="text-center text-2xl font-black tabular-nums"
                  />
                </div>
              </div>
              <Button onClick={handleLogSet} size="lg" className="w-full py-5 text-lg">
                {t.labels.recordSet}
              </Button>
            </div>
          </div>

          <div className="shrink-0 space-y-3 bg-app-bg pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-4">
            {removedSet && (
              <div role="status" className="flex items-center justify-between gap-3 rounded-xl bg-app-surface-muted px-3 py-2 text-sm text-app-text">
                <span>{t.labels.removeSet}</span>
                <Button type="button" variant="secondary" size="sm" onClick={handleUndoRemoveSet}>
                  {t.actions.undo}
                </Button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                onClick={prevExercise}
                disabled={currentIndex === 0}
                className="gap-1"
              >
                <ChevronLeft size={18} />
                {t.labels.previousExercise}
              </Button>
              <Button
                variant="secondary"
                onClick={nextExercise}
                disabled={isLast}
                className="gap-1"
              >
                {t.labels.nextExercise}
                <ChevronRight size={18} />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="ghost" onClick={() => openExercisePicker('add')} className="gap-1">
                <Plus size={18} />
                {t.labels.addExercise}
              </Button>
              <Button variant="ghost" onClick={() => openExercisePicker('replace')} className="gap-1">
                <ArrowLeftRight size={18} />
                {t.labels.changeExercise}
              </Button>
            </div>
            <Button variant="destructive" onClick={() => setShowSummary(true)} className="w-full gap-1">
                {t.labels.finishWorkout}
            </Button>
          </div>
        </div>
      )}

      {showSummary && (
        <WorkoutSummaryModal
          name={activeWorkout.name || t.labels.freeWorkout}
          startedAt={activeWorkout.startedAt}
          now={now}
          entryCount={activeWorkout.exercises.filter((item) => item.sets.length > 0).length}
          setCount={activeWorkout.exercises.reduce((sum, item) => sum + item.sets.length, 0)}
          onConfirm={handleFinish}
          onCancel={() => setShowSummary(false)}
        />
      )}

      {showDiscardConfirm && (
        <ConfirmModal
          title={t.labels.discardWorkout}
          message={t.labels.discardWorkoutConfirm}
          confirmLabel={t.actions.delete}
          destructive
          onConfirm={handleDiscardConfirm}
          onCancel={() => setShowDiscardConfirm(false)}
        />
      )}

      {showAddExercise && (
        <AddExerciseModal
          search={exerciseSearch}
          onSearchChange={setExerciseSearch}
          title={exercisePickerMode === 'replace' ? t.labels.changeExercise : t.labels.addExercise}
          onSelect={handleExerciseSelected}
          onClose={closeExercisePicker}
        />
      )}
    </div>
  );
};

const WorkoutSummaryModal: React.FC<{
  name: string;
  startedAt: string;
  now: number;
  entryCount: number;
  setCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ name, startedAt, now, entryCount, setCount, onConfirm, onCancel }) => {
  const t = useTranslations();
  return (
    <Modal open onClose={onCancel} position="center">
      <div className="space-y-6 p-6">
        <h2 className="text-center text-xl font-bold text-app-text">{t.labels.workoutSummary}</h2>
        <div className="space-y-2 text-center">
          <p className="text-sm font-semibold text-app-text">{name}</p>
          <p className="text-xs text-app-text-muted">
            {t.labels.duration}: {formatElapsed(startedAt, now)}
          </p>
          <p className="text-xs text-app-text-muted">
            {entryCount} {t.labels.exercises} · {setCount} {t.labels.setsCount}
          </p>
        </div>
        <div className="space-y-3">
          <Button onClick={onConfirm} className="w-full">
            {t.labels.confirmFinish}
          </Button>
          <Button variant="secondary" onClick={onCancel} className="w-full">
            {t.actions.cancel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const AddExerciseModal: React.FC<{
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (exerciseId: string) => void;
  onClose: () => void;
  title: string;
}> = ({ search, onSearchChange, onSelect, onClose, title }) => {
  const t = useTranslations();
  const { exercises } = useAppData();
  const filtered = exercises
    .filter((exercise) => !search || exercise.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Modal open onClose={onClose} position="bottom">
      <div className="flex max-h-[70dvh] w-full flex-col">
        <div className="shrink-0 border-b border-app-border px-6 pb-4 pt-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-app-text">{title}</h2>
            <button onClick={onClose} className="rounded-full border border-app-border p-2 text-app-text-muted active:opacity-70" aria-label={t.actions.cancel}>
              <X size={18} />
            </button>
          </div>
          <div className="mt-3">
            <SearchInput value={search} onChange={(e) => onSearchChange(e.target.value)} onClear={() => onSearchChange('')} placeholder={t.labels.searchExercises} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-app-text-muted">{t.labels.noExercisesFound}</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((exercise) => (
                <button
                  key={exercise.id}
                  onClick={() => onSelect(exercise.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-app-border bg-app-surface px-4 py-3.5 text-left transition-colors active:bg-app-surface-muted"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-app-text">{exercise.name}</p>
                    <p className="text-xs text-app-text-muted">{getTranslatedGroupName(exercise.muscleGroup)}</p>
                  </div>
                  <Plus size={18} className="shrink-0 text-app-text-muted" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
