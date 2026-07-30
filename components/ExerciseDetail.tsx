import React, { useCallback, useEffect, useState } from 'react';
import { MoreVertical, Pencil, Trash2, X } from 'lucide-react';
import { Exercise, ExerciseLog } from '../types';
import { getTranslatedGroupName, useTranslations } from '../utils/translations';
import { getLatestLog, getLogFeedback } from '../utils/progression';
import { useToast } from '../hooks/useToast';
import { useRestTimer } from '../hooks/useRestTimer';
import { ExerciseInsights } from './ExerciseInsights';
import ConfirmModal from './ConfirmModal';
import { ActionSheet } from './ActionSheet';
import { BackButton } from './ui/BackButton';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Surface } from './ui/Surface';
import { MuscleGroupPicker } from './ui/MuscleGroupPicker';
import { Badge } from './ui/Badge';
import { cn } from '../utils/cn';

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
  onLog: (weight: number | null, reps: number | null) => void;
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
  const t = useTranslations();
  const { selectDuration, startTimer } = useRestTimer();
  const latest = getLatestLog(exercise.logs);

  const [weight, setWeight] = useState(() => (latest?.weight ?? '').toString());
  const [reps, setReps] = useState(() => (latest?.reps ?? '').toString());
  const [note, setNote] = useState(exercise.note ?? '');

  const [editableLogs, setEditableLogs] = useState<EditableLog[]>([]);
  const [confirmAction, setConfirmAction] = useState<{ action: ConfirmAction; logIndex?: number } | null>(null);
  const [showHistoryActions, setShowHistoryActions] = useState(false);

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
    setWeight((latest?.weight ?? '').toString());
    setReps((latest?.reps ?? '').toString());
  }, [latest?.weight, latest?.reps]);

  useEffect(() => {
    const sorted = [...exercise.logs].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    setEditableLogs(
      sorted.map((log) => ({
        originalDate: log.date,
        date: log.date,
        weight: log.weight === null ? '' : log.weight.toString(),
        reps: log.reps === null ? '' : log.reps.toString(),
      }))
    );
  }, [exercise.logs]);

  const parseWeight = (value: string): number | null => {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === '-') return null;
    const parsed = parseInt(trimmed, 10);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const parseReps = (value: string): number | null => {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    const parsed = parseInt(trimmed, 10);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const handleLog = () => {
    const w = parseWeight(weight);
    const r = parseReps(reps);
    if (w === null && r === null) return;

    const prevWeight = latest?.weight ?? null;
    const prevReps = latest?.reps ?? null;
    const isFirst = exercise.logs.length === 0;

    onLog(w, r);
    setWeight('');
    setReps('');

    const feedback = getLogFeedback(w, r, prevWeight, prevReps, isFirst);
    selectDuration(90);
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

  const handleLogChange = useCallback((index: number, field: keyof EditableLog, value: string) => {
    if (field === 'weight' || field === 'reps') {
      if (value !== '' && value !== '-' && !/^-?\d+$/.test(value)) return;
    }
    setEditableLogs((prev) =>
      prev.map((log, i) => (i === index ? { ...log, [field]: value } : log))
    );
  }, []);

  const handleLogBlur = useCallback(
    (index: number) => {
      const log = editableLogs[index];
      const w = parseWeight(log.weight);
      const r = parseReps(log.reps);
      if (!log.date || (w === null && r === null)) return;
      onUpdateLog(log.originalDate, { date: log.date, weight: w, reps: r });
      setEditableLogs((prev) =>
        prev.map((item, i) => (i === index ? { ...item, originalDate: log.date } : item))
      );
    },
    [editableLogs, onUpdateLog]
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

      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editingName ? (
            <input
              autoFocus
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={(e) => { if (e.key === 'Enter') handleNameBlur(); if (e.key === 'Escape') setEditingName(false); }}
              className="w-full border-b-2 border-app-text bg-transparent pb-1 text-xl font-bold text-app-text outline-none"
            />
          ) : (
            <button
              className="flex min-w-0 items-center gap-2 group active:opacity-70"
              onClick={() => setEditingName(true)}
            >
              <h1 className="min-w-0 flex-1 break-words text-xl font-bold text-app-text">{exercise.name}</h1>
              <Pencil size={16} className="shrink-0 text-app-text-muted opacity-60 group-hover:opacity-100" />
            </button>
          )}

          <button
            onClick={() => setShowGroupPicker((v) => !v)}
            className="mt-2 active:opacity-70"
          >
            <Badge variant="neutral" className="text-xs font-medium">
              {getTranslatedGroupName(exercise.muscleGroup)}
            </Badge>
          </button>
        </div>

        <button
          onClick={() => setConfirmAction({ action: 'deleteExercise' })}
          className="flex h-10 w-10 shrink-0 items-center justify-center text-app-danger active:opacity-60"
          aria-label={t.actions.delete}
        >
          <Trash2 size={20} />
        </button>
      </div>

      {showGroupPicker && (
        <div className="mb-6">
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

      {routineExercise && (
        <Surface className="mb-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-app-text-muted">{t.labels.routines}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-app-text-muted">{t.labels.sets}</label>
              <Input
                compact
                type="text"
                inputMode="numeric"
                value={routineSets}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^\d+$/.test(val)) {
                    setRoutineSets(val);
                  }
                }}
                onBlur={handleRoutineSetsBlur}
                className="text-center tabular-nums"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-app-text-muted">{t.labels.reps}</label>
              <Input compact type="text" inputMode="text" value={routineReps} onChange={(e) => setRoutineReps(e.target.value)} onBlur={handleRoutineRepsBlur} disabled={routineExercise.toFailure} className="text-center tabular-nums disabled:opacity-30" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-app-text-muted">{t.labels.dropset}</label>
              <button onClick={handleToggleDropset} className={cn('w-full rounded-lg border px-3 py-3 text-sm font-semibold transition-colors active:opacity-70', routineExercise.dropset ? 'border-app-warning bg-app-warning text-white' : 'border-app-border bg-app-surface text-app-text-muted')}>
                {routineExercise.dropset ? 'Yes' : 'No'}
              </button>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-app-text-muted">{t.labels.toFailure}</label>
              <button onClick={handleToggleToFailure} className={cn('w-full rounded-lg border px-3 py-3 text-sm font-semibold transition-colors active:opacity-70', routineExercise.toFailure ? 'border-app-danger bg-app-danger text-white' : 'border-app-border bg-app-surface text-app-text-muted')}>
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
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-app-text-muted">{t.labels.newSet}</p>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-app-text-muted">{t.labels.weight}</label>
            <Input
              type="text"
              inputMode="text"
              value={weight}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || val === '-' || /^-?\d+$/.test(val)) {
                  setWeight(val);
                }
              }}
              placeholder={latest?.weight === null ? '—' : latest?.weight.toString() ?? '0'}
              className="text-center tabular-nums"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-app-text-muted">{t.labels.reps}</label>
            <Input
              type="text"
              inputMode="text"
              value={reps}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || val === '-' || /^-?\d+$/.test(val)) {
                  setReps(val);
                }
              }}
              placeholder={latest?.reps === null ? '—' : latest?.reps.toString() ?? '0'}
              className="text-center tabular-nums"
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
        <div className="mb-2 pb-24">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-app-text">{t.labels.history}</p>
            <button
              onClick={() => setShowHistoryActions(true)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-app-text-muted active:opacity-70"
              aria-label={t.labels.history}
            >
              <MoreVertical size={20} />
            </button>
          </div>

          <div className="mb-1 flex items-center gap-3 px-1 text-[10px] font-semibold uppercase tracking-wide text-app-text-muted">
            <span className="w-28">{t.labels.date}</span>
            <span className="w-16 text-center">{t.labels.weight}</span>
            <span className="w-16 text-center">{t.labels.reps}</span>
          </div>

          <div className="divide-y divide-app-border border-t border-app-border">
            {editableLogs.map((log, index) => (
              <div
                key={log.originalDate}
                className="flex items-center gap-3 py-3"
              >
                <Input
                  type="text"
                  value={log.date}
                  onChange={(e) => handleLogChange(index, 'date', e.target.value)}
                  onBlur={() => handleLogBlur(index)}
                  compact
                  placeholder="YYYY-MM-DD"
                  className="w-28 text-xs text-app-text-muted tabular-nums"
                />
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    type="text"
                    inputMode="text"
                    value={log.weight}
                    onChange={(e) => handleLogChange(index, 'weight', e.target.value)}
                    onBlur={() => handleLogBlur(index)}
                    compact
                    className="w-16 text-center text-sm font-semibold tabular-nums"
                  />
                  <span className="text-sm text-app-text-muted">×</span>
                  <Input
                    type="text"
                    inputMode="text"
                    value={log.reps}
                    onChange={(e) => handleLogChange(index, 'reps', e.target.value)}
                    onBlur={() => handleLogBlur(index)}
                    compact
                    className="w-16 text-center text-sm font-semibold tabular-nums"
                  />
                </div>
                <button
                  onClick={() => setConfirmAction({ action: 'deleteLog', logIndex: index })}
                  className="flex h-8 w-8 shrink-0 items-center justify-center text-app-text-muted active:text-app-danger"
                  aria-label={t.actions.delete}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <ExerciseInsights exercise={exercise} />

      {showHistoryActions && (
        <ActionSheet
          title={t.labels.history}
          actions={[
            { label: t.actions.deleteAllExceptLatest, destructive: true, onPress: () => setConfirmAction({ action: 'deleteAllExceptLatest' }) },
            { label: t.actions.deleteAll, destructive: true, onPress: () => setConfirmAction({ action: 'deleteAll' }) },
          ]}
          onClose={() => setShowHistoryActions(false)}
        />
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
