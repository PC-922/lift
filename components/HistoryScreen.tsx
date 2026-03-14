import React, { useEffect, useMemo, useState } from 'react';
import { Exercise, ExerciseLog } from '../types';
import { t, translations } from '../utils/translations';

interface Props {
  exercises: Exercise[];
  onUpdateLog: (exerciseId: string, originalDate: string, log: ExerciseLog) => void;
  onDeleteLog: (exerciseId: string, date: string) => void;
  onDeleteAllLogs: (exerciseId: string) => void;
  onDeleteAllLogsExceptLatest: (exerciseId: string) => void;
}

interface EditableLog {
  originalDate: string;
  date: string;
  weight: string;
  reps: string;
}

export const HistoryScreen: React.FC<Props> = ({ exercises, onUpdateLog, onDeleteLog, onDeleteAllLogs, onDeleteAllLogsExceptLatest }) => {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [editableLogs, setEditableLogs] = useState<EditableLog[]>([]);

  const sortedExercises = useMemo(
    () => [...exercises].sort((a, b) => a.name.localeCompare(b.name)),
    [exercises]
  );

  const selectedExercise = useMemo(
    () => exercises.find((exercise) => exercise.id === selectedExerciseId) ?? null,
    [exercises, selectedExerciseId]
  );

  useEffect(() => {
    if (!selectedExercise) {
      setEditableLogs([]);
      return;
    }

    const sortedLogs = [...selectedExercise.logs].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    setEditableLogs(
      sortedLogs.map((log) => ({
        originalDate: log.date,
        date: log.date,
        weight: log.weight.toString(),
        reps: log.reps.toString(),
      }))
    );
  }, [selectedExercise]);

  const getTranslatedGroupName = (group: string) => {
    return (translations.es.muscleGroups as any)[group] ? (t.muscleGroups as any)[group] : group;
  };

  const handleLogChange = (index: number, field: keyof EditableLog, value: string) => {
    setEditableLogs((prev) =>
      prev.map((log, currentIndex) =>
        currentIndex === index ? { ...log, [field]: value } : log
      )
    );
  };

  const handleSaveLog = (index: number) => {
    if (!selectedExercise) return;
    const log = editableLogs[index];
    const weight = parseFloat(log.weight);
    const reps = parseInt(log.reps, 10);
    if (!log.date || Number.isNaN(weight) || Number.isNaN(reps)) return;

    onUpdateLog(selectedExercise.id, log.originalDate, {
      date: log.date,
      weight,
      reps,
    });

    setEditableLogs((prev) =>
      prev.map((item, currentIndex) =>
        currentIndex === index ? { ...item, originalDate: log.date } : item
      )
    );
  };

  const handleDeleteLog = (index: number) => {
    if (!selectedExercise) return;
    const log = editableLogs[index];
    if (!window.confirm(t.prompts.confirmDelete)) return;
    onDeleteLog(selectedExercise.id, log.originalDate);
  };

  const handleDeleteAllLogs = () => {
    if (!selectedExercise) return;
    if (!window.confirm(t.prompts.confirmDeleteAll)) return;
    onDeleteAllLogs(selectedExercise.id);
  };

  const handleDeleteAllLogsExceptLatest = () => {
    if (!selectedExercise) return;
    if (!window.confirm(t.prompts.confirmDeleteAllExceptLatest)) return;
    onDeleteAllLogsExceptLatest(selectedExercise.id);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-ios-text">{t.labels.history}</h1>
        <p className="text-sm text-ios-gray mt-2">{t.labels.historyDesc}</p>
      </div>

      {sortedExercises.length === 0 ? (
        <div className="text-center py-20 opacity-50">
          <p className="text-ios-text font-medium">{t.labels.noExercises}</p>
          <p className="text-sm text-ios-gray mt-2">{t.labels.noExercisesDesc}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedExercises.map((exercise) => (
            <button
              key={exercise.id}
              onClick={() => setSelectedExerciseId(exercise.id)}
              data-testid="history-exercise-item"
              className="w-full text-left bg-ios-card rounded-2xl p-4 active:opacity-70 transition-opacity"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-ios-text">{exercise.name}</h3>
                  <p className="text-xs text-ios-gray mt-1 uppercase tracking-wide">
                    {getTranslatedGroupName(exercise.muscleGroup)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-ios-gray">{t.labels.sessions}</p>
                  <p className="text-lg font-semibold text-ios-text">{exercise.logs.length}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-ios-card w-full max-w-md rounded-2xl p-6 shadow-2xl animate-scaleIn max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-ios-text">{selectedExercise.name}</h2>
                <p className="text-xs text-ios-gray mt-1 uppercase tracking-wide">
                  {getTranslatedGroupName(selectedExercise.muscleGroup)}
                </p>
              </div>
              <button
                onClick={() => setSelectedExerciseId(null)}
                className="px-3 py-1.5 rounded-lg text-ios-gray active:opacity-70"
              >
                {t.actions.close}
              </button>
            </div>

            {editableLogs.length > 0 && (
              <div className="flex gap-2 mb-4">
                <button
                  onClick={handleDeleteAllLogsExceptLatest}
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/30 active:opacity-70"
                >
                  {t.actions.deleteAllExceptLatest}
                </button>
                <button
                  onClick={handleDeleteAllLogs}
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/30 active:opacity-70"
                >
                  {t.actions.deleteAll}
                </button>
              </div>
            )}

            {editableLogs.length === 0 ? (
              <div className="text-center py-12 opacity-50">
                <p className="text-ios-text font-medium">{t.labels.noLogs}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {editableLogs.map((log, index) => {
                  const dateId = `log-date-${index}`;
                  const weightId = `log-weight-${index}`;
                  const repsId = `log-reps-${index}`;

                  return (
                    <div key={log.originalDate} className="bg-ios-bg rounded-2xl p-4">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label
                            htmlFor={dateId}
                            className="block text-xs font-medium text-ios-gray mb-1"
                          >
                            {t.labels.date}
                          </label>
                          <input
                            id={dateId}
                            type="date"
                            value={log.date}
                            onChange={(e) => handleLogChange(index, 'date', e.target.value)}
                            className="w-full bg-ios-card text-ios-text p-2 rounded-lg border-none outline-none focus:ring-2 focus:ring-ios-blue"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={weightId}
                            className="block text-xs font-medium text-ios-gray mb-1"
                          >
                            {t.labels.weightShort}
                          </label>
                          <input
                            id={weightId}
                            type="number"
                            inputMode="decimal"
                            value={log.weight}
                            onChange={(e) => handleLogChange(index, 'weight', e.target.value)}
                            className="w-full bg-ios-card text-ios-text p-2 rounded-lg border-none outline-none focus:ring-2 focus:ring-ios-blue"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={repsId}
                            className="block text-xs font-medium text-ios-gray mb-1"
                          >
                            {t.labels.reps}
                          </label>
                          <input
                            id={repsId}
                            type="number"
                            inputMode="numeric"
                            value={log.reps}
                            onChange={(e) => handleLogChange(index, 'reps', e.target.value)}
                            className="w-full bg-ios-card text-ios-text p-2 rounded-lg border-none outline-none focus:ring-2 focus:ring-ios-blue"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => handleSaveLog(index)}
                          className="flex-1 py-2 rounded-lg font-semibold bg-ios-blue text-white active:opacity-80"
                        >
                          {t.actions.save}
                        </button>
                        <button
                          onClick={() => handleDeleteLog(index)}
                          className="flex-1 py-2 rounded-lg font-semibold bg-red-500 text-white active:opacity-80"
                        >
                          {t.actions.delete}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
