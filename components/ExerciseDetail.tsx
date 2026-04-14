import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, Pencil, Trash2, X } from 'lucide-react';
import { Exercise, ExerciseLog } from '../types';
import { useTranslations, getTranslatedGroupName } from '../utils/translations';
import { getLatestLog } from '../utils/progression';
import { useToast } from '../hooks/useToast';
import ConfirmModal from './ConfirmModal';
import { Modal } from './Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Surface } from './ui/Surface';
import { Badge } from './ui/Badge';
import { MuscleGroupPicker } from './ui/MuscleGroupPicker';
import { cn } from '../utils/cn';

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
}) => {
  const { showToast } = useToast();
  const t = useTranslations();
  const latest = getLatestLog(exercise.logs);

  const [weight, setWeight] = useState(() => latest?.weight.toString() ?? '');
  const [reps, setReps] = useState(() => latest?.reps.toString() ?? '');
  const [note, setNote] = useState(exercise.note ?? '');

  const [editableLogs, setEditableLogs] = useState<EditableLog[]>([]);
  const [confirmAction, setConfirmAction] = useState<{ action: ConfirmAction; logIndex?: number } | null>(null);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(exercise.name);
  const [editingGroup, setEditingGroup] = useState(false);

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

  const confirmConfigs: Record<ConfirmAction, { title: string; message?: string; label: string }> = {
    deleteLog: { title: t.prompts.confirmDelete, label: t.actions.delete },
    deleteAll: { title: t.actions.deleteAll, message: t.prompts.confirmDeleteAll, label: t.actions.deleteAll },
    deleteAllExceptLatest: { title: t.actions.deleteAllExceptLatest, message: t.prompts.confirmDeleteAllExceptLatest, label: t.actions.deleteAllExceptLatest },
    deleteExercise: { title: t.prompts.deleteExercise.replace('{name}', exercise.name), label: t.actions.delete },
  };

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="-ml-2 flex h-10 w-10 items-center justify-center text-app-text active:opacity-60"
        >
          <ChevronLeft size={28} />
        </button>
        <button
          onClick={() => setConfirmAction({ action: 'deleteExercise' })}
          className="flex h-10 w-10 items-center justify-center text-app-danger active:opacity-60"
        >
          <Trash2 size={20} />
        </button>
      </div>

      <div className="mb-6">
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
          onClick={() => setEditingGroup(true)}
          className="mt-1 text-sm text-app-text underline decoration-app-accent decoration-2 underline-offset-4 active:opacity-70"
        >
          {getTranslatedGroupName(exercise.muscleGroup)}
        </button>
      </div>

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
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-app-text-muted">{t.labels.date}</label>
                    <Input
                      type="date"
                      value={log.date}
                      onChange={(e) => handleLogChange(index, 'date', e.target.value)}
                      onBlur={() => handleLogBlur(index)}
                      compact
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

      <Modal open={editingGroup} onClose={() => setEditingGroup(false)} position="center">
        <div
          className="mx-4 w-full max-w-sm animate-scaleIn rounded-2xl border border-app-border bg-app-surface p-6"
          onClick={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <h2 className="mb-4 text-lg font-bold text-app-text">{t.labels.muscleGroup}</h2>
          <MuscleGroupPicker
            groups={muscleGroups}
            selected={exercise.muscleGroup}
            onSelect={(group) => {
              onChangeGroup(group);
              setEditingGroup(false);
            }}
            maxHeightClass="max-h-[50vh]"
          />
          <Button onClick={() => setEditingGroup(false)} variant="secondary" className="w-full mt-4">
            {t.actions.cancel}
          </Button>
        </div>
      </Modal>

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
