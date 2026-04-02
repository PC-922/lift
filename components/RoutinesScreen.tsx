import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, Check, ChevronUp, Pencil, X, Search, ChevronDown, ArrowUp, ArrowDown, Shuffle } from 'lucide-react';
import { Exercise, Routine, RoutineExercise } from '../types';
import { t, getTranslatedGroupName } from '../utils/translations';
import { getLatestLog } from '../utils/progression';
import { RoutineCard } from './RoutineCard';
import { ActionSheet } from './ActionSheet';
import ConfirmModal from './ConfirmModal';
import { Modal } from './Modal';
import { useLongPress } from '../hooks/useLongPress';
import { useToast } from '../hooks/useToast';

interface Props {
  routines: Routine[];
  exercises: Exercise[];
  onSaveRoutine: (routine: Routine) => void;
  onDeleteRoutine: (id: string) => void;
  onLogExercise: (exerciseId: string, weight: number, reps: number) => void;
  onReorderRoutineExercise: (routineId: string, from: number, to: number) => void;
  resetSignal?: number;
}

type ModalMode = 'create' | 'edit';

interface LogFormState {
  weight: string;
  reps: string;
}

const DEFAULT_SETS = 3;
const DEFAULT_REPS = '10';

export const RoutinesScreen: React.FC<Props> = ({
  routines,
  exercises,
  onSaveRoutine,
  onDeleteRoutine,
  onLogExercise,
  onReorderRoutineExercise,
  resetSignal,
}) => {
  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);

  const [formName, setFormName] = useState('');
  const [formExercises, setFormExercises] = useState<RoutineExercise[]>([]);
  const [formSearch, setFormSearch] = useState('');

  const [logForms, setLogForms] = useState<Record<string, LogFormState>>({});
  // Track which exercises are using their alternative
  const [usingAlternative, setUsingAlternative] = useState<Record<string, boolean>>({});

  const [actionSheetExerciseId, setActionSheetExerciseId] = useState<string | null>(null);
  const [confirmDeleteRoutineId, setConfirmDeleteRoutineId] = useState<string | null>(null);
  const [confirmRemoveExerciseId, setConfirmRemoveExerciseId] = useState<string | null>(null);

  // Alternative picker: which slot is being configured
  const [pickingAlternativeFor, setPickingAlternativeFor] = useState<string | null>(null);
  const [alternativeSearch, setAlternativeSearch] = useState('');

  useEffect(() => {
    setActiveRoutineId(null);
    setModalMode(null);
  }, [resetSignal]);

  const { showToast } = useToast();

  const activeRoutine = useMemo(
    () => routines.find((r) => r.id === activeRoutineId) ?? null,
    [routines, activeRoutineId]
  );

  const activeRoutineExercises = useMemo(() => {
    if (!activeRoutine) return [];
    return activeRoutine.exercises
      .map((re) => ({
        routineExercise: re,
        exercise: exercises.find((e) => e.id === re.exerciseId),
        alternativeExercise: re.alternativeExerciseId
          ? exercises.find((e) => e.id === re.alternativeExerciseId)
          : undefined,
      }))
      .filter((item): item is {
        routineExercise: RoutineExercise;
        exercise: Exercise;
        alternativeExercise: Exercise | undefined;
      } => item.exercise !== undefined);
  }, [activeRoutine, exercises]);

  const openCreate = () => {
    setFormName('');
    setFormExercises([]);
    setFormSearch('');
    setEditingRoutine(null);
    setModalMode('create');
  };

  const openEdit = (routine: Routine) => {
    setFormName(routine.name);
    setFormExercises([...routine.exercises]);
    setFormSearch('');
    setEditingRoutine(routine);
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingRoutine(null);
  };

  const toggleExercise = (exerciseId: string) => {
    setFormExercises((prev) => {
      const exists = prev.find((re) => re.exerciseId === exerciseId);
      if (exists) return prev.filter((re) => re.exerciseId !== exerciseId);
      return [...prev, { exerciseId, sets: DEFAULT_SETS, reps: DEFAULT_REPS, dropset: false, toFailure: false }];
    });
  };

  const updateFormExerciseField = (exerciseId: string, field: 'sets' | 'reps', value: string) => {
    setFormExercises((prev) =>
      prev.map((re) => (re.exerciseId === exerciseId ? { ...re, [field]: value } : re))
    );
  };

  const commitSetsField = (exerciseId: string, value: string) => {
    const parsed = parseInt(value, 10);
    const num = Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;
    setFormExercises((prev) =>
      prev.map((re) => (re.exerciseId === exerciseId ? { ...re, sets: num } : re))
    );
  };

  const toggleDropset = (exerciseId: string) => {
    setFormExercises((prev) =>
      prev.map((re) => (re.exerciseId === exerciseId ? { ...re, dropset: !re.dropset } : re))
    );
  };

  const toggleToFailure = (exerciseId: string) => {
    setFormExercises((prev) =>
      prev.map((re) => {
        if (re.exerciseId !== exerciseId) return re;
        const next = !re.toFailure;
        return { ...re, toFailure: next, reps: next ? '' : DEFAULT_REPS };
      })
    );
  };

  const setAlternative = (exerciseId: string, alternativeId: string | undefined) => {
    setFormExercises((prev) =>
      prev.map((re) =>
        re.exerciseId === exerciseId
          ? { ...re, alternativeExerciseId: alternativeId }
          : re
      )
    );
  };

  const handleSave = () => {
    const name = formName.trim();
    if (!name) return;
    onSaveRoutine({
      id: editingRoutine?.id ?? Date.now().toString(),
      name,
      exercises: formExercises,
    });
    closeModal();
  };

  const handleDelete = (id: string) => setConfirmDeleteRoutineId(id);

  const handleConfirmDeleteRoutine = () => {
    if (!confirmDeleteRoutineId) return;
    onDeleteRoutine(confirmDeleteRoutineId);
    if (activeRoutineId === confirmDeleteRoutineId) setActiveRoutineId(null);
    setConfirmDeleteRoutineId(null);
  };

  const handleDuplicate = (routine: Routine) => {
    onSaveRoutine({
      id: Date.now().toString(),
      name: `${routine.name} (2)`,
      exercises: [...routine.exercises],
    });
  };

  const getLogForm = useCallback((exerciseId: string): LogFormState => {
    if (logForms[exerciseId]) return logForms[exerciseId];
    const latest = getLatestLog(exercises.find((e) => e.id === exerciseId)?.logs ?? []);
    return {
      weight: latest?.weight.toString() ?? '',
      reps: latest?.reps.toString() ?? '',
    };
  }, [logForms, exercises]);

  const updateLogForm = (exerciseId: string, field: keyof LogFormState, value: string) => {
    setLogForms((prev) => ({
      ...prev,
      [exerciseId]: { ...getLogForm(exerciseId), [field]: value },
    }));
  };

  const handleLog = (exerciseId: string) => {
    const isAlt = usingAlternative[exerciseId];
    const re = activeRoutine?.exercises.find((r) => r.exerciseId === exerciseId);
    const targetId = isAlt && re?.alternativeExerciseId ? re.alternativeExerciseId : exerciseId;
    const form = getLogForm(exerciseId);
    const weight = parseFloat(form.weight);
    const reps = parseInt(form.reps, 10);
    if (Number.isNaN(weight) || Number.isNaN(reps)) return;

    const targetExercise = exercises.find((e) => e.id === targetId);
    const latest = getLatestLog(targetExercise?.logs ?? []);
    const isFirst = (targetExercise?.logs ?? []).length === 0;
    const prevMax = latest?.weight ?? 0;

    onLogExercise(targetId, weight, reps);
    // Reset to empty so next render picks up the newly logged value via getLogForm fallback
    setLogForms((prev) => {
      const next = { ...prev };
      delete next[exerciseId];
      return next;
    });

    if (isFirst) {
      showToast(t.labels.firstLog, 'achievement');
    } else if (weight > prevMax) {
      showToast(t.labels.newWeightRecord, 'achievement');
    }
  };

  const handleMoveUp = (exerciseId: string) => {
    if (!activeRoutine) return;
    const idx = activeRoutine.exercises.findIndex((re) => re.exerciseId === exerciseId);
    if (idx <= 0) return;
    onReorderRoutineExercise(activeRoutine.id, idx, idx - 1);
  };

  const handleMoveDown = (exerciseId: string) => {
    if (!activeRoutine) return;
    const idx = activeRoutine.exercises.findIndex((re) => re.exerciseId === exerciseId);
    if (idx === -1 || idx >= activeRoutine.exercises.length - 1) return;
    onReorderRoutineExercise(activeRoutine.id, idx, idx + 1);
  };

  const handleRemoveExerciseFromRoutine = (exerciseId: string) => {
    if (!activeRoutine) return;
    onSaveRoutine({
      ...activeRoutine,
      exercises: activeRoutine.exercises.filter((re) => re.exerciseId !== exerciseId),
    });
    setConfirmRemoveExerciseId(null);
  };

  const filteredFormExercises = useMemo(() => {
    const q = formSearch.toLowerCase();
    return exercises
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((ex) => !q || ex.name.toLowerCase().includes(q));
  }, [exercises, formSearch]);

  const filteredAlternativeExercises = useMemo(() => {
    const q = alternativeSearch.toLowerCase();
    return exercises
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((ex) => !q || ex.name.toLowerCase().includes(q));
  }, [exercises, alternativeSearch]);

  const actionSheetExerciseIndex = actionSheetExerciseId
    ? activeRoutine?.exercises.findIndex((re) => re.exerciseId === actionSheetExerciseId) ?? -1
    : -1;
  const isFirst = actionSheetExerciseIndex === 0;
  const isLast = activeRoutine
    ? actionSheetExerciseIndex === activeRoutine.exercises.length - 1
    : true;
  const actionSheetExerciseName = actionSheetExerciseId
    ? exercises.find((e) => e.id === actionSheetExerciseId)?.name ?? ''
    : '';

  return (
    <div className="space-y-6">
      {activeRoutine ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setActiveRoutineId(null)}
              className="text-ios-blue font-semibold text-sm active:opacity-70"
            >
              ← {t.labels.routines}
            </button>
            <h1 className="text-xl font-bold text-ios-text truncate max-w-[60%] text-center">
              {activeRoutine.name}
            </h1>
            <button
              onClick={() => openEdit(activeRoutine)}
              className="text-ios-blue active:opacity-70 p-1"
              aria-label={t.actions.edit}
            >
              <Pencil size={18} />
            </button>
          </div>

          {activeRoutineExercises.length === 0 ? (
            <div className="text-center py-20 opacity-50">
              <p className="text-ios-text font-medium">{t.labels.noExercises}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeRoutineExercises.map(({ routineExercise, exercise, alternativeExercise }) => {
                const isAlt = !!usingAlternative[exercise.id];
                const displayExercise = isAlt && alternativeExercise ? alternativeExercise : exercise;
                const form = getLogForm(exercise.id);

                return (
                  <RoutineExerciseCard
                    key={exercise.id}
                    routineExercise={routineExercise}
                    exercise={displayExercise}
                    alternativeExercise={alternativeExercise}
                    isUsingAlternative={isAlt}
                    form={form}
                    onUpdateForm={(field, value) => updateLogForm(exercise.id, field, value)}
                    onLog={() => handleLog(exercise.id)}
                    onLongPress={() => setActionSheetExerciseId(exercise.id)}
                    onToggleAlternative={() =>
                      setUsingAlternative((prev) => ({ ...prev, [exercise.id]: !prev[exercise.id] }))
                    }
                  />
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <p className="text-sm text-ios-gray mt-2">{t.labels.routinesDesc}</p>
          </div>

          {routines.length === 0 ? (
            <div className="text-center py-20 opacity-50">
              <p className="text-ios-text font-medium">{t.labels.noRoutines}</p>
              <p className="text-sm text-ios-gray mt-2">{t.labels.noRoutinesDesc}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {routines.map((routine) => (
                <RoutineCard
                  key={routine.id}
                  routine={routine}
                  onClick={() => setActiveRoutineId(routine.id)}
                  onEdit={() => openEdit(routine)}
                  onDelete={() => handleDelete(routine.id)}
                  onDuplicate={() => handleDuplicate(routine)}
                />
              ))}
            </div>
          )}

          <button
            onClick={openCreate}
            className="fixed right-6 w-14 h-14 bg-ios-blue rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center text-white active:scale-95 transition-transform z-40"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}
            aria-label={t.labels.newRoutine}
          >
            <Plus size={28} strokeWidth={2.5} />
          </button>
        </div>
      )}

      <Modal open={!!modalMode} onClose={closeModal} position="bottom">
        <div
          className="bg-ios-card w-full max-w-md rounded-t-3xl shadow-2xl flex flex-col"
          style={{ maxHeight: '85vh', paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
          onClick={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <div className="px-6 pt-6 pb-4 flex items-center justify-between flex-shrink-0">
            <h2 className="text-xl font-bold text-ios-text">
              {modalMode === 'create' ? t.labels.newRoutine : t.labels.editRoutine}
            </h2>
            <button onClick={closeModal} className="text-ios-gray active:opacity-70">
              <X size={22} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 px-6">
            <div className="mb-5">
              <label className="block text-xs font-medium text-ios-gray mb-2 uppercase tracking-wide">
                {t.labels.routineName}
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t.labels.routineName}
                className="w-full bg-ios-bg text-ios-text p-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-ios-blue"
                autoFocus
              />
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-ios-gray mb-2 uppercase tracking-wide">
                {t.labels.selectExercises}
              </label>

              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ios-gray pointer-events-none" />
                <input
                  type="text"
                  value={formSearch}
                  onChange={(e) => setFormSearch(e.target.value)}
                  placeholder={t.labels.searchExercises}
                  className="w-full bg-ios-bg text-ios-text pl-8 pr-8 py-2.5 rounded-xl border-none outline-none focus:ring-2 focus:ring-ios-blue text-sm"
                />
                {formSearch && (
                  <button
                    onClick={() => setFormSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ios-gray active:opacity-70"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {filteredFormExercises.length === 0 ? (
                <p className="text-ios-gray text-sm text-center py-4">{t.labels.noExercisesFound}</p>
              ) : (
                <div className="space-y-2 pb-2">
                  {filteredFormExercises.map((exercise) => {
                    const routineEx = formExercises.find((re) => re.exerciseId === exercise.id);
                    const selected = routineEx !== undefined;
                    return (
                      <div key={exercise.id}>
                        <button
                          onClick={() => toggleExercise(exercise.id)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors active:opacity-70 ${
                            selected
                              ? 'bg-ios-blue/10 border border-ios-blue/40'
                              : 'bg-ios-bg border border-transparent'
                          }`}
                        >
                          <div className="text-left">
                            <p className="text-sm font-semibold text-ios-text">{exercise.name}</p>
                            <p className="text-xs text-ios-gray mt-0.5">
                              {getTranslatedGroupName(exercise.muscleGroup)}
                            </p>
                          </div>
                          {selected ? (
                            <ChevronUp size={18} className="text-ios-blue flex-shrink-0" />
                          ) : (
                            <Check size={18} className="text-ios-gray/30 flex-shrink-0" />
                          )}
                        </button>

                        {selected && routineEx && (
                          <div className="mt-1 mb-1 px-3 py-3 bg-ios-bg rounded-xl border border-ios-blue/20">
                            <div className="grid grid-cols-4 gap-2 items-end mb-2">
                              <div>
                                <label className="block text-xs font-medium text-ios-gray mb-1">{t.labels.sets}</label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={routineEx.sets}
                                  onChange={(e) => updateFormExerciseField(exercise.id, 'sets', e.target.value)}
                                  onBlur={(e) => commitSetsField(exercise.id, e.target.value)}
                                  className="w-full bg-ios-card text-ios-text p-2 rounded-lg border-none outline-none focus:ring-2 focus:ring-ios-blue text-sm text-center"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-ios-gray mb-1">{t.labels.reps}</label>
                                <input
                                  type="text"
                                  inputMode="text"
                                  value={routineEx.reps}
                                  onChange={(e) => updateFormExerciseField(exercise.id, 'reps', e.target.value)}
                                  disabled={routineEx.toFailure}
                                  className="w-full bg-ios-card text-ios-text p-2 rounded-lg border-none outline-none focus:ring-2 focus:ring-ios-blue text-sm text-center disabled:opacity-30"
                                  placeholder="10"
                                />
                              </div>
                              <div className="flex flex-col items-center">
                                <label className="block text-xs font-medium text-ios-gray mb-1">{t.labels.dropset}</label>
                                <button
                                  onClick={() => toggleDropset(exercise.id)}
                                  className={`w-full py-2 rounded-lg text-xs font-semibold transition-colors active:opacity-70 ${
                                    routineEx.dropset
                                      ? 'bg-orange-500 text-white'
                                      : 'bg-ios-card text-ios-gray border border-ios-separator'
                                  }`}
                                >
                                  {routineEx.dropset ? '✓' : '—'}
                                </button>
                              </div>
                              <div className="flex flex-col items-center">
                                <label className="block text-xs font-medium text-ios-gray mb-1">{t.labels.toFailure}</label>
                                <button
                                  onClick={() => toggleToFailure(exercise.id)}
                                  className={`w-full py-2 rounded-lg text-xs font-semibold transition-colors active:opacity-70 ${
                                    routineEx.toFailure
                                      ? 'bg-red-500 text-white'
                                      : 'bg-ios-card text-ios-gray border border-ios-separator'
                                  }`}
                                >
                                  {routineEx.toFailure ? '✓' : '—'}
                                </button>
                              </div>
                            </div>

                            <div className="mt-1">
                              {routineEx.alternativeExerciseId ? (
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-ios-gray">
                                    {t.labels.alternative}:{' '}
                                    <span className="font-semibold text-ios-text">
                                      {exercises.find((e) => e.id === routineEx.alternativeExerciseId)?.name ?? '—'}
                                    </span>
                                  </p>
                                  <button
                                    onClick={() => setAlternative(exercise.id, undefined)}
                                    className="text-xs text-red-500 active:opacity-70"
                                  >
                                    {t.labels.clearAlternative}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => { setPickingAlternativeFor(exercise.id); setAlternativeSearch(''); }}
                                  className="text-xs text-ios-blue active:opacity-70 flex items-center gap-1"
                                >
                                  <Shuffle size={12} />
                                  {t.labels.setAlternative}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="px-6 pt-3 flex-shrink-0 border-t border-ios-separator">
            <button
              onClick={handleSave}
              disabled={!formName.trim()}
              className="w-full py-3 rounded-xl bg-ios-blue text-white font-semibold text-base active:opacity-80 disabled:opacity-40"
            >
              {t.actions.save}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!pickingAlternativeFor} onClose={() => setPickingAlternativeFor(null)} position="bottom">
        <div
          className="bg-ios-card w-full max-w-md rounded-t-3xl p-6 shadow-2xl"
          style={{ maxHeight: '70vh', overflowY: 'auto', paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
          onClick={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-ios-text">{t.labels.setAlternative}</h2>
            <button onClick={() => setPickingAlternativeFor(null)} className="text-ios-gray active:opacity-70">
              <X size={22} />
            </button>
          </div>
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ios-gray pointer-events-none" />
            <input
              type="text"
              value={alternativeSearch}
              onChange={(e) => setAlternativeSearch(e.target.value)}
              placeholder={t.labels.searchExercises}
              className="w-full bg-ios-bg text-ios-text pl-8 pr-4 py-2.5 rounded-xl border-none outline-none focus:ring-2 focus:ring-ios-blue text-sm"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            {filteredAlternativeExercises
              .filter((ex) => ex.id !== pickingAlternativeFor)
              .map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => {
                    if (pickingAlternativeFor) setAlternative(pickingAlternativeFor, ex.id);
                    setPickingAlternativeFor(null);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-ios-bg active:bg-ios-blue/10 transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-semibold text-ios-text">{ex.name}</p>
                    <p className="text-xs text-ios-gray">{getTranslatedGroupName(ex.muscleGroup)}</p>
                  </div>
                  <Check size={16} className="text-ios-gray/30" />
                </button>
              ))}
          </div>
        </div>
      </Modal>

      {actionSheetExerciseId && (
        <ActionSheet
          title={actionSheetExerciseName}
          actions={[
            ...(!isFirst ? [{ label: t.labels.moveUp, icon: <ArrowUp size={16} />, onPress: () => { handleMoveUp(actionSheetExerciseId); setActionSheetExerciseId(null); } }] : []),
            ...(!isLast ? [{ label: t.labels.moveDown, icon: <ArrowDown size={16} />, onPress: () => { handleMoveDown(actionSheetExerciseId); setActionSheetExerciseId(null); } }] : []),
            {
              label: t.labels.removeFromRoutine,
              destructive: true,
              onPress: () => {
                setConfirmRemoveExerciseId(actionSheetExerciseId);
                setActionSheetExerciseId(null);
              },
            },
          ]}
          onClose={() => setActionSheetExerciseId(null)}
        />
      )}

      {confirmDeleteRoutineId && (
        <ConfirmModal
          title={t.prompts.confirmDelete}
          confirmLabel={t.actions.delete}
          destructive
          onConfirm={handleConfirmDeleteRoutine}
          onCancel={() => setConfirmDeleteRoutineId(null)}
        />
      )}

      {confirmRemoveExerciseId && (
        <ConfirmModal
          title={t.labels.removeFromRoutine}
          confirmLabel={t.actions.delete}
          destructive
          onConfirm={() => handleRemoveExerciseFromRoutine(confirmRemoveExerciseId)}
          onCancel={() => setConfirmRemoveExerciseId(null)}
        />
      )}
    </div>
  );
};

interface RoutineExerciseCardProps {
  routineExercise: RoutineExercise;
  exercise: Exercise;
  alternativeExercise: Exercise | undefined;
  isUsingAlternative: boolean;
  form: LogFormState;
  onUpdateForm: (field: keyof LogFormState, value: string) => void;
  onLog: () => void;
  onLongPress: () => void;
  onToggleAlternative: () => void;
}

const RoutineExerciseCard: React.FC<RoutineExerciseCardProps> = ({
  routineExercise,
  exercise,
  alternativeExercise,
  isUsingAlternative,
  form,
  onUpdateForm,
  onLog,
  onLongPress,
  onToggleAlternative,
}) => {
  const handlers = useLongPress({ onLongPress });

  return (
    <div
      {...handlers}
      className="bg-ios-card rounded-2xl p-4"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-ios-text truncate">{exercise.name}</h3>
          <p className="text-xs text-ios-gray uppercase tracking-wide mt-0.5">
            {getTranslatedGroupName(exercise.muscleGroup)}
          </p>
        </div>
        {alternativeExercise && (
          <button
            onClick={onToggleAlternative}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="ml-2 flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-ios-blue bg-ios-blue/10 px-2 py-1 rounded-full active:opacity-70"
          >
            <Shuffle size={11} />
            {isUsingAlternative ? t.labels.swapToMain : t.labels.swapToAlternative}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-ios-blue bg-ios-blue/10 px-2 py-0.5 rounded-full">
          {routineExercise.reps
            ? `${routineExercise.sets}×${routineExercise.reps}`
            : `${routineExercise.sets}`}
        </span>
        {routineExercise.toFailure && (
          <span className="text-xs font-semibold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">
            {t.labels.toFailure}
          </span>
        )}
        {routineExercise.dropset && (
          <span className="text-xs font-semibold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">
            {t.labels.dropset}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-xs font-medium text-ios-gray mb-1">{t.labels.weightShort}</label>
          <input
            type="number"
            inputMode="decimal"
            value={form.weight}
            onChange={(e) => onUpdateForm('weight', e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            placeholder="0"
            className="w-full bg-ios-bg text-ios-text p-2 rounded-lg border-none outline-none focus:ring-2 focus:ring-ios-blue text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ios-gray mb-1">{t.labels.reps}</label>
          <input
            type="number"
            inputMode="numeric"
            value={form.reps}
            onChange={(e) => onUpdateForm('reps', e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            placeholder="0"
            className="w-full bg-ios-bg text-ios-text p-2 rounded-lg border-none outline-none focus:ring-2 focus:ring-ios-blue text-sm"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={onLog}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="w-full py-2 rounded-lg bg-ios-blue text-white text-sm font-semibold active:opacity-80"
          >
            {t.actions.log}
          </button>
        </div>
      </div>
    </div>
  );
};
