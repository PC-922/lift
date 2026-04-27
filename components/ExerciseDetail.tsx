import React, {useCallback, useEffect, useState} from 'react';
import {Pencil, Trash2, X} from 'lucide-react';
import {Exercise, ExerciseLog} from '../types';
import {getTranslatedGroupName, useTranslations} from '../utils/translations';
import {getLatestLog} from '../utils/progression';
import {useToast} from '../hooks/useToast';
import {useRestTimer} from '../hooks/useRestTimer';
import ConfirmModal from './ConfirmModal';
import {BackButton} from './ui/BackButton';
import {Button} from './ui/Button';
import {Input} from './ui/Input';
import {Surface} from './ui/Surface';
import {MuscleGroupPicker} from './ui/MuscleGroupPicker';
import {cn} from '../utils/cn';

interface RoutineExerciseSettings {
  sets: number;
  reps: string;
  dropset: boolean;
  toFailure: boolean;
}

interface Props {
  exercise: Exercise;
  muscleGroups: string[];
  onBack: () => void;
  onLog: (weight: number, reps: number) => void;
  onUpdateNote: (note: string) => void;
  onUpdateLog: (originalDate: string, log: ExerciseLog) => void;
  onDeleteLog: (date: string) => void;
  onDeleteAllLogs: () => void;
  onDeleteAllLogsExceptLatest: () => void;
  onRename: (name: string) => void;
  onChangeGroup: (group: string) => void;
  onDelete: () => void;
  backLabel?: string;
  routineExercise?: RoutineExerciseSettings;
  onUpdateRoutineExercise?: (settings: RoutineExerciseSettings) => void;
}

interface EditableLog {
  originalDate: string;
  date: string;
  weight: string;
  reps: string;
}

type ConfirmAction = 'deleteLog' | 'deleteAll' | 'deleteAllExceptLatest' | 'deleteExercise';

export const ExerciseDetail: React.FC<Props> = ({
  exercise,
  muscleGroups,
  onBack,
  onLog,
  onUpdateNote,
  onUpdateLog,
  onDeleteLog,
  onDeleteAllLogs,
  onDeleteAllLogsExceptLatest,
  onRename,
  onChangeGroup,
  onDelete,
  backLabel,
  routineExercise,
  onUpdateRoutineExercise,
}) => {
  const { showToast } = useToast();
  const { startTimer } = useRestTimer();
  const t = useTranslations();
  const latest = getLatestLog(exercise.logs);

  const [weight, setWeight] = useState(() => latest?.weight.toString() ?? '');
  const [reps, setReps] = useState(() => latest?.reps.toString() ?? '');
  const [note, setNote] = useState(exercise.note ?? '');

  const [editableLogs, setEditableLogs] = useState<EditableLog[]>([]);
  const [confirmAction, setConfirmAction] = useState<{ action: ConfirmAction; logIndex?: number } | null>(null);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(exercise.name);
  const [showGroupPicker, setShowGroupPicker] = useState(false);

  const [routineSets, setRoutineSets] = useState(routineExercise?.sets.toString() ?? '');
  const [routineReps, setRoutineReps] = useState(routineExercise?.reps ?? '');

  useEffect(() => {
    setNote(exercise.note ?? '');
    setNameValue(exercise.name);
  }, [exercise.note, exercise.name]);

  useEffect(() => {
    setWeight(latest?.weight.toString() ?? '');
    setReps(latest?.reps.toString() ?? '');
  }, [latest?.weight, latest?.reps]);

  useEffect(() => {
    const sorted = [...exercise.logs].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    setEditableLogs(
      sorted.map((log) => ({
        originalDate: log.date,
        date: log.date,
        weight: log.weight.toString(),
        reps: log.reps.toString(),
      }))
    );
  }, [exercise.logs]);

  const handleLog = () => {
    const w = parseFloat(weight);
    const r = parseInt(reps, 10);
    if (Number.isNaN(w) || Number.isNaN(r)) return;

    const prevMax = latest?.weight ?? 0;
    const isFirst = exercise.logs.length === 0;

    onLog(w, r);
    setWeight('');
    setReps('');

    if (isFirst) {
      showToast(t.labels.firstLog, 'achievement');
    } else if (w > prevMax) {
      showToast(t.labels.newWeightRecord, 'achievement');
    }
  };

  const handleLogChange = useCallback((index: number, field: keyof EditableLog, value: string) => {
    setEditableLogs((prev) =>
      prev.map((log, i) => (i === index ? { ...log, [field]: value } : log))
    );
  }, []);

  const handleLogBlur = useCallback(
    (index: number) => {
      const log = editableLogs[index];
      const w = parseFloat(log.weight);
      const r = parseInt(log.reps, 10);
      if (!log.date || Number.isNaN(w) || Number.isNaN(r)) return;
      onUpdateLog(log.originalDate, { date: log.date, weight: w, reps: r });
      setEditableLogs((prev) =>
        prev.map((item, i) => (i === index ? { ...item, originalDate: log.date } : item))
      );

      const prevMax = Math.max(0, ...exercise.logs.map((l) => l.weight));
      if (w > prevMax) {
        showToast(t.labels.newWeightRecord, 'achievement');
      }
    },
    [editableLogs, onUpdateLog, exercise.logs, showToast]
  );

  const handleConfirm = () => {
    if (!confirmAction) return;
    const { action, logIndex } = confirmAction;
    if (action === 'deleteLog' && logIndex !== undefined) {
      onDeleteLog(editableLogs[logIndex].originalDate);
    } else if (action === 'deleteAll') {
      onDeleteAllLogs();
    } else if (action === 'deleteAllExceptLatest') {
      onDeleteAllLogsExceptLatest();
    } else if (action === 'deleteExercise') {
      onDelete();
    }
    setConfirmAction(null);
  };

  const handleNameBlur = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== exercise.name) {
      onRename(trimmed);
    }
    setEditingName(false);
  };

  const handleRoutineSetsBlur = () => {
    const sets = parseInt(routineSets, 10);
    if (!routineExercise || Number.isNaN(sets) || sets < 1) return;
    onUpdateRoutineExercise?.({ ...routineExercise, sets });
  };

  const handleRoutineRepsBlur = () => {
    if (!routineExercise || !routineReps.trim()) return;
    onUpdateRoutineExercise?.({ ...routineExercise, reps: routineReps });
  };

  const handleToggleDropset = () => {
    if (!routineExercise) return;
    onUpdateRoutineExercise?.({ ...routineExercise, dropset: !routineExercise.dropset });
  };

  const handleToggleToFailure = () => {
    if (!routineExercise) return;
    onUpdateRoutineExercise?.({ ...routineExercise, toFailure: !routineExercise.toFailure });
  };

  const confirmConfigs: Record<ConfirmAction, { title: string; message?: string; label: string }> = {
    deleteLog: { title: t.prompts.confirmDelete, label: t.actions.delete },
    deleteAll: { title: t.actions.deleteAll, message: t.prompts.confirmDeleteAll, label: t.actions.deleteAll },
    deleteAllExceptLatest: { title: t.actions.deleteAllExceptLatest, message: t.prompts.confirmDeleteAllExceptLatest, label: t.actions.deleteAllExceptLatest },
    deleteExercise: { title: t.prompts.deleteExercise.replace('{name}', exercise.name), label: t.actions.delete },
  };

  return (
    <div className="animate-fadeIn">
      <div className="mb-6">
        <BackButton label={backLabel ?? t.labels.home} onClick={onBack} />
      </div>


      <div className="mb-6">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {editingName ? (
              <input
                autoFocus
                type="text"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={handleNameBlur}
                onKeyDown={(e) => { if (e.key === 'Enter') handleNameBlur(); if (e.key === 'Escape') setEditingName(false); }}
                className="w-full border-b-2 border-app-accent bg-transparent pb-1 text-2xl font-bold text-app-text outline-none"
              />
            ) : (
              <button
                className="flex items-center gap-2 group active:opacity-70"
                onClick={() => setEditingName(true)}
              >
                <h1 className="text-2xl font-bold text-app-text">{exercise.name}</h1>
                <Pencil size={16} className="text-app-text-muted opacity-60 group-hover:opacity-100" />
              </button>
            )}

            <button
              onClick={() => setShowGroupPicker((v) => !v)}
              className="mt-1 text-sm text-app-text underline decoration-app-accent decoration-2 underline-offset-4 active:opacity-70"
            >
              {getTranslatedGroupName(exercise.muscleGroup)}
            </button>
          </div>

          <button
            onClick={() => setConfirmAction({ action: 'deleteExercise' })}
            className="flex h-10 w-10 shrink-0 items-center justify-center text-app-danger active:opacity-60"
          >
            <Trash2 size={20} />
          </button>
        </div>

        {showGroupPicker && (
          <div className="mt-3">
            <MuscleGroupPicker
              groups={muscleGroups}
              selected={exercise.muscleGroup}
              onSelect={(group) => {
                onChangeGroup(group);
                setShowGroupPicker(false);
              }}
            />
          </div>
        )}
      </div>

      {routineExercise && (
        <Surface className="mb-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-app-text-muted">{t.labels.routines}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-app-text-muted">{t.labels.sets}</label>
              <Input compact type="text" inputMode="numeric" value={routineSets} onChange={(e) => setRoutineSets(e.target.value)} onBlur={handleRoutineSetsBlur} className="text-center" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-app-text-muted">{t.labels.reps}</label>
              <Input compact type="text" inputMode="text" value={routineReps} onChange={(e) => setRoutineReps(e.target.value)} onBlur={handleRoutineRepsBlur} disabled={routineExercise.toFailure} className="text-center disabled:opacity-30" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-app-text-muted">{t.labels.dropset}</label>
              <button onClick={handleToggleDropset} className={cn('w-full rounded-xl border px-3 py-3 text-sm font-semibold transition-colors active:opacity-70', routineExercise.dropset ? 'border-app-warning bg-app-warning text-white' : 'border-app-border bg-app-surface text-app-text-muted')}>
                {routineExercise.dropset ? 'Yes' : 'No'}
              </button>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-app-text-muted">{t.labels.toFailure}</label>
              <button onClick={handleToggleToFailure} className={cn('w-full rounded-xl border px-3 py-3 text-sm font-semibold transition-colors active:opacity-70', routineExercise.toFailure ? 'border-app-danger bg-app-danger text-white' : 'border-app-border bg-app-surface text-app-text-muted')}>
                {routineExercise.toFailure ? 'Yes' : 'No'}
              </button>
            </div>
          </div>
        </Surface>
      )}

      <Surface className="mb-4">
        <label className="mb-1 block text-xs font-medium text-app-text-muted">{t.labels.note}</label>
        <Input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => { if (note !== (exercise.note ?? '')) onUpdateNote(note); }}
          placeholder={t.labels.notePlaceholder}
        />
      </Surface>

      <Surface className="mb-6">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-app-text-muted">{t.labels.newExercise.replace('Nuevo ', '').replace('New ', '')}</p>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-app-text-muted">{t.labels.weight}</label>
            <Input
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder={latest?.weight.toString() ?? '0'}
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-app-text-muted">{t.labels.reps}</label>
            <Input
              type="number"
              inputMode="numeric"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              placeholder={latest?.reps.toString() ?? '0'}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleLog} className="h-12 px-5">
              {t.actions.log}
            </Button>
          </div>
        </div>
      </Surface>

      {editableLogs.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium uppercase tracking-wide text-app-text-muted">{t.labels.history}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmAction({ action: 'deleteAllExceptLatest' })}
                className="text-xs text-app-danger active:opacity-70"
              >
                {t.actions.deleteAllExceptLatest}
              </button>
              <span className="text-app-border">|</span>
              <button
                onClick={() => setConfirmAction({ action: 'deleteAll' })}
                className="text-xs text-app-danger active:opacity-70"
              >
                {t.actions.deleteAll}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {editableLogs.map((log, index) => (
              <Surface key={log.originalDate}>
                <div className="space-y-3">
                  <div className="min-w-0">
                    <label className="mb-1 block text-xs font-medium text-app-text-muted">{t.labels.date}</label>
                    <Input
                      type="text"
                      value={log.date}
                      onChange={(e) => handleLogChange(index, 'date', e.target.value)}
                      onBlur={() => handleLogBlur(index)}
                      compact
                      placeholder="YYYY-MM-DD"
                      className="w-full text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-app-text-muted">{t.labels.weightShort}</label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={log.weight}
                        onChange={(e) => handleLogChange(index, 'weight', e.target.value)}
                        onBlur={() => handleLogBlur(index)}
                        compact
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-app-text-muted">{t.labels.reps}</label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={log.reps}
                        onChange={(e) => handleLogChange(index, 'reps', e.target.value)}
                        onBlur={() => handleLogBlur(index)}
                        compact
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => setConfirmAction({ action: 'deleteLog', logIndex: index })}
                    className="flex items-center gap-1 text-xs text-app-danger active:opacity-70"
                  >
                    <X size={12} />
                    {t.actions.delete}
                  </button>
                </div>
              </Surface>
        ))}
      </div>
        </div>
      )}

      {confirmAction && (
        <ConfirmModal
          title={confirmConfigs[confirmAction.action].title}
          message={confirmConfigs[confirmAction.action].message}
          confirmLabel={confirmConfigs[confirmAction.action].label}
          destructive
          onConfirm={handleConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
};
