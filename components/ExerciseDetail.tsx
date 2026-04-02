import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, Pencil, Trash2, X } from 'lucide-react';
import { Exercise, ExerciseLog } from '../types';
import { t, getTranslatedGroupName } from '../utils/translations';
import { getLatestLog } from '../utils/progression';
import { useToast } from '../hooks/useToast';
import ConfirmModal from './ConfirmModal';
import { Modal } from './Modal';

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
          className="w-10 h-10 flex items-center justify-center -ml-2 text-ios-blue active:opacity-60"
        >
          <ChevronLeft size={28} />
        </button>
        <button
          onClick={() => setConfirmAction({ action: 'deleteExercise' })}
          className="w-10 h-10 flex items-center justify-center text-red-500 active:opacity-60"
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
            className="text-2xl font-bold text-ios-text bg-transparent border-b-2 border-ios-blue outline-none w-full pb-1"
          />
        ) : (
          <button
            className="flex items-center gap-2 group active:opacity-70"
            onClick={() => setEditingName(true)}
          >
            <h1 className="text-2xl font-bold text-ios-text">{exercise.name}</h1>
            <Pencil size={16} className="text-ios-gray opacity-60 group-hover:opacity-100" />
          </button>
        )}

        <button
          onClick={() => setEditingGroup(true)}
          className="mt-1 text-sm text-ios-blue active:opacity-70"
        >
          {getTranslatedGroupName(exercise.muscleGroup)}
        </button>
      </div>

      <div className="bg-ios-card rounded-2xl p-4 mb-4">
        <label className="block text-xs font-medium text-ios-gray mb-1">{t.labels.note}</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => { if (note !== (exercise.note ?? '')) onUpdateNote(note); }}
          placeholder={t.labels.notePlaceholder}
          className="w-full bg-ios-bg text-ios-text text-base p-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-ios-blue"
        />
      </div>

      <div className="bg-ios-card rounded-2xl p-4 mb-6">
        <p className="text-xs font-medium text-ios-gray uppercase tracking-wide mb-3">{t.labels.newExercise.replace('Nuevo ', '').replace('New ', '')}</p>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-ios-gray mb-1">{t.labels.weight}</label>
            <input
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder={latest?.weight.toString() ?? '0'}
              className="w-full bg-ios-bg text-ios-text text-lg p-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-ios-blue"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-ios-gray mb-1">{t.labels.reps}</label>
            <input
              type="number"
              inputMode="numeric"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              placeholder={latest?.reps.toString() ?? '0'}
              className="w-full bg-ios-bg text-ios-text text-lg p-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-ios-blue"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleLog}
              className="bg-ios-blue text-white font-semibold h-[52px] px-5 rounded-xl active:opacity-80 transition-opacity"
            >
              {t.actions.log}
            </button>
          </div>
        </div>
      </div>

      {editableLogs.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-ios-gray uppercase tracking-wide">{t.labels.history}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmAction({ action: 'deleteAllExceptLatest' })}
                className="text-xs text-red-500 active:opacity-70"
              >
                {t.actions.deleteAllExceptLatest}
              </button>
              <span className="text-ios-separator">|</span>
              <button
                onClick={() => setConfirmAction({ action: 'deleteAll' })}
                className="text-xs text-red-500 active:opacity-70"
              >
                {t.actions.deleteAll}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {editableLogs.map((log, index) => (
              <div key={log.originalDate} className="bg-ios-card rounded-2xl p-4">
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-xs font-medium text-ios-gray mb-1">{t.labels.date}</label>
                    <input
                      type="date"
                      value={log.date}
                      onChange={(e) => handleLogChange(index, 'date', e.target.value)}
                      onBlur={() => handleLogBlur(index)}
                      className="bg-ios-bg text-ios-text p-2 rounded-lg border-none outline-none focus:ring-2 focus:ring-ios-blue text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-ios-gray mb-1">{t.labels.weightShort}</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={log.weight}
                        onChange={(e) => handleLogChange(index, 'weight', e.target.value)}
                        onBlur={() => handleLogBlur(index)}
                        className="w-full bg-ios-bg text-ios-text p-2 rounded-lg border-none outline-none focus:ring-2 focus:ring-ios-blue"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ios-gray mb-1">{t.labels.reps}</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={log.reps}
                        onChange={(e) => handleLogChange(index, 'reps', e.target.value)}
                        onBlur={() => handleLogBlur(index)}
                        className="w-full bg-ios-bg text-ios-text p-2 rounded-lg border-none outline-none focus:ring-2 focus:ring-ios-blue"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => setConfirmAction({ action: 'deleteLog', logIndex: index })}
                    className="text-xs text-red-500 active:opacity-70 flex items-center gap-1"
                  >
                    <X size={12} />
                    {t.actions.delete}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={editingGroup} onClose={() => setEditingGroup(false)} position="center">
        <div
          className="bg-ios-card w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-scaleIn mx-4"
          onClick={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <h2 className="text-lg font-bold mb-4 text-ios-text">{t.labels.muscleGroup}</h2>
          <div className="grid grid-cols-3 gap-2 mb-4 max-h-[50vh] overflow-y-auto">
            {muscleGroups.map((g) => (
              <button
                key={g}
                onClick={() => { onChangeGroup(g); setEditingGroup(false); }}
                className={`py-2 px-1 rounded-lg text-sm font-medium transition-colors truncate ${
                  g === exercise.muscleGroup
                    ? 'bg-ios-blue text-white shadow-md'
                    : 'bg-ios-bg text-ios-text active:bg-gray-200 dark:active:bg-gray-700'
                }`}
              >
                {getTranslatedGroupName(g)}
              </button>
            ))}
          </div>
          <button
            onClick={() => setEditingGroup(false)}
            className="w-full py-3 rounded-xl font-semibold bg-ios-bg text-ios-text active:opacity-70"
          >
            {t.actions.cancel}
          </button>
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
