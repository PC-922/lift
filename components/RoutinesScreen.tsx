import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Pencil, X, ArrowUp, ArrowDown, Shuffle, Plus } from 'lucide-react';
import { Exercise, Routine, RoutineExercise, ExerciseLog } from '../types';
import { useTranslations, getTranslatedGroupName } from '../utils/translations';
import { getLatestLog } from '../utils/progression';
import { RoutineCard } from './RoutineCard';
import { ActionSheet } from './ActionSheet';
import ConfirmModal from './ConfirmModal';
import { Modal } from './Modal';
import { useLongPress } from '../hooks/useLongPress';
import { useToast } from '../hooks/useToast';
import { makeId } from '../services/storageService';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Input } from './ui/Input';
import { SearchInput } from './ui/SearchInput';
import { ListRow } from './ui/ListRow';
import { BackButton } from './ui/BackButton';
import { cn } from '../utils/cn';

interface Props {
  routines: Routine[];
  exercises: Exercise[];
  muscleGroups: string[];
  activeRoutineId: string | null;
  onActiveRoutineChange: (id: string | null) => void;
  onSaveRoutine: (routine: Routine) => void;
  onDeleteRoutine: (id: string) => void;
  onLogExercise: (exerciseId: string, weight: number, reps: number) => void;
  onReorderRoutine: (from: number, to: number) => void;
  onReorderRoutineExercise: (routineId: string, from: number, to: number) => void;
  onUpdateNote: (exerciseId: string, note: string) => void;
  onUpdateLog: (exerciseId: string, originalDate: string, log: ExerciseLog) => void;
  onDeleteLog: (exerciseId: string, date: string) => void;
  onDeleteAllLogs: (exerciseId: string) => void;
  onDeleteAllLogsExceptLatest: (exerciseId: string) => void;
  onDeleteExercise: (exerciseId: string) => void;
  onNavigateToExercise: (exerciseId: string, routineId: string) => void;
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
  muscleGroups,
  activeRoutineId,
  onActiveRoutineChange,
  onSaveRoutine,
  onDeleteRoutine,
  onLogExercise,
  onReorderRoutine,
  onReorderRoutineExercise,
  onUpdateNote,
  onUpdateLog,
  onDeleteLog,
  onDeleteAllLogs,
  onDeleteAllLogsExceptLatest,
  onDeleteExercise,
  onNavigateToExercise,
  resetSignal,
}) => {
  const t = useTranslations();
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [formName, setFormName] = useState('');
  const [formExercises, setFormExercises] = useState<RoutineExercise[]>([]);
  const [formSearch, setFormSearch] = useState('');
  const [logForms, setLogForms] = useState<Record<string, LogFormState>>({});
  const [usingAlternative, setUsingAlternative] = useState<Record<string, boolean>>({});
  const [actionSheetExerciseId, setActionSheetExerciseId] = useState<string | null>(null);
  const [confirmDeleteRoutineId, setConfirmDeleteRoutineId] = useState<string | null>(null);
  const [confirmRemoveExerciseId, setConfirmRemoveExerciseId] = useState<string | null>(null);
  const [pickingAlternativeFor, setPickingAlternativeFor] = useState<string | null>(null);
  const [alternativeSearch, setAlternativeSearch] = useState('');
  const [movingExerciseId, setMovingExerciseId] = useState<string | null>(null);
  const [movingExerciseTargetIndex, setMovingExerciseTargetIndex] = useState<number>(0);
  const [movingRoutineId, setMovingRoutineId] = useState<string | null>(null);
  const [movingRoutineTargetIndex, setMovingRoutineTargetIndex] = useState<number>(0);

  useEffect(() => {
    setModalMode(null);
  }, [resetSignal]);

  const { showToast } = useToast();

  const activeRoutine = useMemo(() => routines.find((r) => r.id === activeRoutineId) ?? null, [routines, activeRoutineId]);
  const exerciseById = useMemo(() => new Map(exercises.map((exercise) => [exercise.id, exercise] as const)), [exercises]);
  const getRoutineMuscleGroups = useCallback(
    (routine: Routine) => Array.from(new Set(
      routine.exercises
        .map((routineExercise) => exerciseById.get(routineExercise.exerciseId)?.muscleGroup)
        .filter((group): group is string => group !== undefined)
    )),
    [exerciseById]
  );

  const activeRoutineExercises = useMemo(() => {
    if (!activeRoutine) return [];
    return activeRoutine.exercises
      .map((re) => ({
        routineExercise: re,
        exercise: exercises.find((e) => e.id === re.exerciseId),
        alternativeExercise: re.alternativeExerciseId ? exercises.find((e) => e.id === re.alternativeExerciseId) : undefined,
      }))
      .filter((item): item is { routineExercise: RoutineExercise; exercise: Exercise; alternativeExercise: Exercise | undefined } => item.exercise !== undefined);
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
    setFormExercises((prev) => prev.map((re) => (re.exerciseId === exerciseId ? { ...re, [field]: value } : re)));
  };

  const commitSetsField = (exerciseId: string, value: string) => {
    const parsed = parseInt(value, 10);
    const num = Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;
    setFormExercises((prev) => prev.map((re) => (re.exerciseId === exerciseId ? { ...re, sets: num } : re)));
  };

  const toggleDropset = (exerciseId: string) => {
    setFormExercises((prev) => prev.map((re) => (re.exerciseId === exerciseId ? { ...re, dropset: !re.dropset } : re)));
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
    setFormExercises((prev) => prev.map((re) => (re.exerciseId === exerciseId ? { ...re, alternativeExerciseId: alternativeId } : re)));
  };

  const handleSave = () => {
    const name = formName.trim();
    if (!name) return;
    onSaveRoutine({ id: editingRoutine?.id ?? makeId('routine'), name, exercises: formExercises });
    closeModal();
  };

  const handleDelete = (id: string) => setConfirmDeleteRoutineId(id);

  const handleConfirmDeleteRoutine = () => {
    if (!confirmDeleteRoutineId) return;
    onDeleteRoutine(confirmDeleteRoutineId);
    if (activeRoutineId === confirmDeleteRoutineId) onActiveRoutineChange(null);
    setConfirmDeleteRoutineId(null);
  };

  const handleDuplicate = (routine: Routine) => {
    onSaveRoutine({ id: makeId('routine'), name: `${routine.name} (2)`, exercises: [...routine.exercises] });
  };

  const getLogForm = useCallback(
    (exerciseId: string): LogFormState => {
      if (logForms[exerciseId]) return logForms[exerciseId];
      const latest = getLatestLog(exerciseById.get(exerciseId)?.logs ?? []);
      return { weight: latest?.weight.toString() ?? '', reps: latest?.reps.toString() ?? '' };
    },
    [logForms, exerciseById]
  );

  const updateLogForm = (exerciseId: string, field: keyof LogFormState, value: string) => {
    setLogForms((prev) => ({ ...prev, [exerciseId]: { ...getLogForm(exerciseId), [field]: value } }));
  };

  const handleLog = (targetId: string) => {
    const form = getLogForm(targetId);
    const weight = parseFloat(form.weight);
    const reps = parseInt(form.reps, 10);
    if (Number.isNaN(weight) || Number.isNaN(reps)) return;

    const targetExercise = exerciseById.get(targetId);
    const latest = getLatestLog(targetExercise?.logs ?? []);
    const isFirst = (targetExercise?.logs ?? []).length === 0;
    const prevWeight = latest?.weight ?? 0;
    const prevReps = latest?.reps ?? 0;

    onLogExercise(targetId, weight, reps);
    setLogForms((prev) => {
      const next = { ...prev };
      delete next[targetId];
      return next;
    });

    if (isFirst) {
      showToast(t.labels.firstLog, 'achievement');
    } else if (weight > prevWeight) {
      showToast(t.labels.newWeightRecord, 'achievement');
    } else if (weight === prevWeight && reps > prevReps) {
      showToast(t.labels.newRepsRecord, 'achievement');
    }
  };

  const openMoveExercise = (exerciseId: string) => {
    if (!activeRoutine) return;
    const idx = activeRoutine.exercises.findIndex((re) => re.exerciseId === exerciseId);
    if (idx === -1) return;
    setMovingExerciseId(exerciseId);
    setMovingExerciseTargetIndex(idx);
  };

  const closeMoveExercise = () => {
    setMovingExerciseId(null);
    setMovingExerciseTargetIndex(0);
  };

  const moveExerciseTarget = (direction: -1 | 1) => {
    if (!activeRoutine) return;
    setMovingExerciseTargetIndex((current) => Math.max(0, Math.min(activeRoutine.exercises.length - 1, current + direction)));
  };

  const applyMoveExercise = () => {
    if (!activeRoutine || !movingExerciseId) return;
    const fromIndex = activeRoutine.exercises.findIndex((re) => re.exerciseId === movingExerciseId);
    if (fromIndex === -1 || fromIndex === movingExerciseTargetIndex) {
      closeMoveExercise();
      return;
    }

    onReorderRoutineExercise(activeRoutine.id, fromIndex, movingExerciseTargetIndex);
    closeMoveExercise();
  };

  const openMoveRoutine = (routineId: string) => {
    const idx = routines.findIndex((r) => r.id === routineId);
    if (idx === -1) return;
    setMovingRoutineId(routineId);
    setMovingRoutineTargetIndex(idx);
  };

  const closeMoveRoutine = () => {
    setMovingRoutineId(null);
    setMovingRoutineTargetIndex(0);
  };

  const moveRoutineTarget = (direction: -1 | 1) => {
    setMovingRoutineTargetIndex((current) => Math.max(0, Math.min(routines.length - 1, current + direction)));
  };

  const applyMoveRoutine = () => {
    if (!movingRoutineId) return;
    const fromIndex = routines.findIndex((r) => r.id === movingRoutineId);
    if (fromIndex === -1 || fromIndex === movingRoutineTargetIndex) {
      closeMoveRoutine();
      return;
    }
    onReorderRoutine(fromIndex, movingRoutineTargetIndex);
    closeMoveRoutine();
  };

  const handleMoveRoutineUp = (id: string) => {
    const index = routines.findIndex((r) => r.id === id);
    if (index > 0) {
      onReorderRoutine(index, index - 1);
    }
  };

  const handleMoveRoutineDown = (id: string) => {
    const index = routines.findIndex((r) => r.id === id);
    if (index < routines.length - 1) {
      onReorderRoutine(index, index + 1);
    }
  };

  const handleRemoveExerciseFromRoutine = (exerciseId: string) => {
    if (!activeRoutine) return;
    onSaveRoutine({ ...activeRoutine, exercises: activeRoutine.exercises.filter((re) => re.exerciseId !== exerciseId) });
    setConfirmRemoveExerciseId(null);
  };

  const filteredFormExercises = useMemo(() => {
    const q = formSearch.toLowerCase();
    return exercises.slice().sort((a, b) => a.name.localeCompare(b.name)).filter((ex) => !q || ex.name.toLowerCase().includes(q));
  }, [exercises, formSearch]);

  const filteredAlternativeExercises = useMemo(() => {
    const q = alternativeSearch.toLowerCase();
    return exercises.slice().sort((a, b) => a.name.localeCompare(b.name)).filter((ex) => !q || ex.name.toLowerCase().includes(q));
  }, [exercises, alternativeSearch]);

  const actionSheetExerciseName = actionSheetExerciseId ? exerciseById.get(actionSheetExerciseId)?.name ?? '' : '';
  const movingExerciseIndex = movingExerciseId ? activeRoutine?.exercises.findIndex((re) => re.exerciseId === movingExerciseId) ?? -1 : -1;
  const movingExerciseName = movingExerciseId ? exerciseById.get(movingExerciseId)?.name ?? '' : '';
  const movePreviewExercises = useMemo(() => {
    if (!activeRoutine || !movingExerciseId || movingExerciseIndex === -1) return [];

    const reordered = [...activeRoutine.exercises];
    const [movingExercise] = reordered.splice(movingExerciseIndex, 1);
    reordered.splice(movingExerciseTargetIndex, 0, movingExercise);
    return reordered.map((routineExercise, index) => ({
      index,
      routineExercise,
      exercise: exerciseById.get(routineExercise.exerciseId),
      isMovingExercise: routineExercise.exerciseId === movingExerciseId,
      isTarget: index === movingExerciseTargetIndex,
    }));
  }, [activeRoutine, movingExerciseId, movingExerciseIndex, movingExerciseTargetIndex, exerciseById]);

  const movingRoutineName = movingRoutineId ? routines.find((r) => r.id === movingRoutineId)?.name ?? '' : '';
  const movingRoutineFromIndex = movingRoutineId ? routines.findIndex((r) => r.id === movingRoutineId) : -1;
  const movePreviewRoutines = useMemo(() => {
    if (!movingRoutineId || movingRoutineFromIndex === -1) return [];
    const reordered = [...routines];
    const [moving] = reordered.splice(movingRoutineFromIndex, 1);
    reordered.splice(movingRoutineTargetIndex, 0, moving);
    return reordered.map((routine, index) => ({
      index,
      routine,
      isMoving: routine.id === movingRoutineId,
      isTarget: index === movingRoutineTargetIndex,
    }));
  }, [routines, movingRoutineId, movingRoutineFromIndex, movingRoutineTargetIndex]);

  return (
    <div className="space-y-6">
      {activeRoutine ? (
        <div className="space-y-4">
          <div className="mb-6">
            <BackButton label={t.labels.routines} onClick={() => onActiveRoutineChange(null)} />
          </div>
          <div className="mb-2 flex items-center justify-between">
            <h1 className="text-xl font-bold text-app-text">{activeRoutine.name}</h1>
            <button onClick={() => openEdit(activeRoutine)} className="p-1 text-app-text active:opacity-70" aria-label={t.actions.edit}>
              <Pencil size={18} />
            </button>
          </div>

          {activeRoutineExercises.length === 0 ? (
            <div className="py-20 text-center opacity-60">
              <p className="font-medium text-app-text">{t.labels.noExercises}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeRoutineExercises.map(({ routineExercise, exercise, alternativeExercise }) => {
                const isAlt = !!usingAlternative[exercise.id];
                const displayExercise = isAlt && alternativeExercise ? alternativeExercise : exercise;
                const form = getLogForm(displayExercise.id);

                return (
                  <RoutineExerciseCard
                    key={exercise.id}
                    routineExercise={routineExercise}
                    exercise={displayExercise}
                    alternativeExercise={alternativeExercise}
                    isUsingAlternative={isAlt}
                    form={form}
                    onUpdateForm={(field, value) => updateLogForm(displayExercise.id, field, value)}
                    onLog={() => handleLog(displayExercise.id)}
                    onLongPress={() => setActionSheetExerciseId(exercise.id)}
                    onTap={() => onNavigateToExercise(displayExercise.id, activeRoutine.id)}
                    onToggleAlternative={() => setUsingAlternative((prev) => ({ ...prev, [exercise.id]: !prev[exercise.id] }))}
                  />
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <p className="-mt-2 mb-2 text-center text-sm text-app-text-muted">{t.labels.routinesDesc}</p>

          <Button onClick={openCreate} className="w-full">
            <Plus size={18} />
            {t.labels.newRoutine}
          </Button>

          {routines.length === 0 ? (
            <div className="py-20 text-center opacity-60">
              <p className="font-medium text-app-text">{t.labels.noRoutines}</p>
              <p className="mt-2 text-sm text-app-text-muted">{t.labels.noRoutinesDesc}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {routines.map((routine) => (
                <RoutineCard
                  key={routine.id}
                  routine={routine}
                  muscleGroups={getRoutineMuscleGroups(routine)}
                  onClick={() => onActiveRoutineChange(routine.id)}
                  onEdit={() => openEdit(routine)}
                  onDelete={() => handleDelete(routine.id)}
                  onDuplicate={() => handleDuplicate(routine)}
                  onMove={() => openMoveRoutine(routine.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <Modal open={!!modalMode} onClose={closeModal} position="bottom">
        <div className="flex max-h-[calc(100dvh-1.5rem-env(safe-area-inset-top,0px))] w-full flex-col pt-[env(safe-area-inset-top,0px)]">
          <div className="shrink-0 border-b border-app-border px-6 pb-4 pt-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-app-text">{modalMode === 'create' ? t.labels.newRoutine : t.labels.editRoutine}</h2>
                <p className="mt-1 text-sm text-app-text-muted">{t.labels.selectExercises}</p>
              </div>
              <button onClick={closeModal} className="rounded-full border border-app-border p-2 text-app-text-muted active:opacity-70" aria-label={t.actions.cancel}>
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="shrink-0 border-b border-app-border px-6 py-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-app-text-muted">{t.labels.routineName}</label>
              <Input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder={t.labels.routineName} autoFocus />
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-5">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-app-text-muted">{t.labels.selectExercises}</label>

              <div className="sticky top-0 z-10 bg-app-surface pb-3 -mx-6 px-6">
                <SearchInput value={formSearch} onChange={(e) => setFormSearch(e.target.value)} onClear={() => setFormSearch('')} placeholder={t.labels.searchExercises} />
              </div>

              {filteredFormExercises.length === 0 ? (
                <p className="py-4 text-center text-sm text-app-text-muted">{t.labels.noExercisesFound}</p>
              ) : (
                <div className="space-y-3 pb-2">
                  {filteredFormExercises.map((exercise) => {
                    const routineEx = formExercises.find((re) => re.exerciseId === exercise.id);
                    const selected = routineEx !== undefined;
                    return (
                      <div key={exercise.id} className="space-y-2">
                        <button
                          onClick={() => toggleExercise(exercise.id)}
                          className={cn(
                            'w-full rounded-2xl border p-4 text-left transition-colors active:opacity-70',
                            selected ? 'border-app-accent bg-app-surface-muted' : 'border-app-border bg-app-surface'
                          )}
                        >
                          <p className="text-sm font-semibold text-app-text">{exercise.name}</p>
                          <p className="mt-0.5 text-xs text-app-text-muted">{getTranslatedGroupName(exercise.muscleGroup)}</p>
                        </button>

                        {selected && routineEx && (
                          <div className="rounded-2xl border border-app-border bg-app-surface-muted px-4 py-4">
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                              <div className="space-y-1">
                                <label className="block text-xs font-medium text-app-text-muted">{t.labels.sets}</label>
                                <Input compact type="text" inputMode="numeric" value={routineEx.sets} onChange={(e) => updateFormExerciseField(exercise.id, 'sets', e.target.value)} onBlur={(e) => commitSetsField(exercise.id, e.target.value)} className="text-center" />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-xs font-medium text-app-text-muted">{t.labels.reps}</label>
                                <Input compact type="text" inputMode="text" value={routineEx.reps} onChange={(e) => updateFormExerciseField(exercise.id, 'reps', e.target.value)} disabled={routineEx.toFailure} className="text-center disabled:opacity-30" placeholder="10" />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-xs font-medium text-app-text-muted">{t.labels.dropset}</label>
                                <button onClick={() => toggleDropset(exercise.id)} className={cn('w-full rounded-xl border px-3 py-3 text-sm font-semibold transition-colors active:opacity-70', routineEx.dropset ? 'border-app-warning bg-app-warning text-app-text' : 'border-app-border bg-app-surface text-app-text-muted')}>
                                  {routineEx.dropset ? 'Yes' : 'No'}
                                </button>
                              </div>
                              <div className="space-y-1">
                                <label className="block text-xs font-medium text-app-text-muted">{t.labels.toFailure}</label>
                                <button onClick={() => toggleToFailure(exercise.id)} className={cn('w-full rounded-xl border px-3 py-3 text-sm font-semibold transition-colors active:opacity-70', routineEx.toFailure ? 'border-app-danger bg-app-danger text-white' : 'border-app-border bg-app-surface text-app-text-muted')}>
                                  {routineEx.toFailure ? 'Yes' : 'No'}
                                </button>
                              </div>
                            </div>

                            <div className="mt-4">
                              {routineEx.alternativeExerciseId ? (
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-xs text-app-text-muted">
                                    {t.labels.alternative}: <span className="font-semibold text-app-text">{exerciseById.get(routineEx.alternativeExerciseId)?.name ?? '—'}</span>
                                  </p>
                                  <button onClick={() => setAlternative(exercise.id, undefined)} className="text-xs text-app-danger active:opacity-70">{t.labels.clearAlternative}</button>
                                </div>
                              ) : (
                                <button onClick={() => { setPickingAlternativeFor(exercise.id); setAlternativeSearch(''); }} className="flex items-center gap-1 text-xs font-medium text-app-text underline decoration-app-accent decoration-2 underline-offset-4 active:opacity-70">
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

          <div className="shrink-0 border-t border-app-border px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
            <Button onClick={handleSave} disabled={!formName.trim()} className="w-full">{t.actions.save}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!pickingAlternativeFor} onClose={() => setPickingAlternativeFor(null)} position="bottom">
        <div className="flex max-h-[calc(100dvh-1.5rem)] w-full flex-col">
          <div className="shrink-0 border-b border-app-border px-6 pb-4 pt-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-app-text">{t.labels.setAlternative}</h2>
              <button onClick={() => setPickingAlternativeFor(null)} className="rounded-full border border-app-border p-2 text-app-text-muted active:opacity-70" aria-label={t.actions.cancel}><X size={18} /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 pt-[env(safe-area-inset-top,1.25rem)]">
            <SearchInput value={alternativeSearch} onChange={(e) => setAlternativeSearch(e.target.value)} onClear={() => setAlternativeSearch('')} placeholder={t.labels.searchExercises} />
            <div className="mt-4 space-y-2">
              {filteredAlternativeExercises.filter((ex) => ex.id !== pickingAlternativeFor).map((ex) => (
                <ListRow key={ex.id} padded={false}>
                  <button onClick={() => { if (pickingAlternativeFor) setAlternative(pickingAlternativeFor, ex.id); setPickingAlternativeFor(null); }} className="w-full px-4 py-4 text-left transition-colors active:bg-app-surface-muted sm:px-5 sm:py-5">
                    <p className="text-sm font-semibold text-app-text">{ex.name}</p>
                    <p className="text-xs text-app-text-muted">{getTranslatedGroupName(ex.muscleGroup)}</p>
                  </button>
                </ListRow>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {actionSheetExerciseId && (
        <ActionSheet
          title={actionSheetExerciseName}
          actions={[
            { label: t.labels.move, onPress: () => { openMoveExercise(actionSheetExerciseId); setActionSheetExerciseId(null); } },
            { label: t.labels.removeFromRoutine, destructive: true, onPress: () => { setConfirmRemoveExerciseId(actionSheetExerciseId); setActionSheetExerciseId(null); } },
          ]}
          onClose={() => setActionSheetExerciseId(null)}
        />
      )}

      <Modal open={!!movingExerciseId} onClose={closeMoveExercise} position="bottom" blurBackdrop={false}>
        {movingExerciseId && activeRoutine && (
          <div className="flex max-h-[calc(100dvh-1.5rem)] w-full flex-col">
            <div className="shrink-0 border-b border-app-border px-6 pb-4 pt-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-app-text">{t.labels.moveExercise}</h2>
                  <p className="mt-1 text-sm text-app-text-muted">{movingExerciseName}</p>
                </div>
                <button onClick={closeMoveExercise} className="rounded-full border border-app-border p-2 text-app-text-muted active:opacity-70" aria-label={t.actions.cancel}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <div className="space-y-2">


                </div>

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => moveExerciseTarget(-1)}
                    disabled={movingExerciseTargetIndex === 0}
                    aria-label={t.labels.moveUp}
                  >
                    <ArrowUp size={16} />
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => moveExerciseTarget(1)}
                    disabled={!activeRoutine.exercises.length || movingExerciseTargetIndex === activeRoutine.exercises.length - 1}
                    aria-label={t.labels.moveDown}
                  >
                    <ArrowDown size={16} />
                  </Button>
                </div>
              </div>



              <div className="mt-5 space-y-3">
                <p className="text-sm font-medium text-app-text-muted">{t.labels.movePreview}</p>
                <div className="space-y-2">
                  {movePreviewExercises.map(({ index, exercise, isMovingExercise, isTarget, routineExercise }) => (
                    <ListRow
                      key={`${routineExercise.exerciseId}-${index}`}
                      className={cn(
                        'px-4 py-3',
                        isMovingExercise ? 'border-app-accent bg-app-accent/10' : '',
                        isTarget ? 'border-2 border-app-accent ring-2 ring-app-accent' : ''
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-app-text">{index + 1}.</span>
                            <p className="text-sm font-semibold text-app-text">{exercise?.name ?? routineExercise.exerciseId}</p>
                          </div>
                          <p className="mt-1 text-xs text-app-text-muted">{getTranslatedGroupName(exercise?.muscleGroup ?? '')}</p>
                        </div>
                      </div>
                    </ListRow>
                  ))}
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-app-border px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
              <div className="flex gap-3">
                <Button onClick={closeMoveExercise} variant="secondary" className="flex-1">{t.actions.cancel}</Button>
                <Button onClick={applyMoveExercise} className="flex-1">{t.actions.save}</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!movingRoutineId} onClose={closeMoveRoutine} position="bottom" blurBackdrop={false}>
        {movingRoutineId && (
          <div className="flex max-h-[calc(100dvh-1.5rem)] w-full flex-col">
            <div className="shrink-0 border-b border-app-border px-6 pb-4 pt-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-app-text">{t.labels.move}</h2>
                  <p className="mt-1 text-sm text-app-text-muted">{movingRoutineName}</p>
                </div>
                <button onClick={closeMoveRoutine} className="rounded-full border border-app-border p-2 text-app-text-muted active:opacity-70" aria-label={t.actions.cancel}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => moveRoutineTarget(-1)}
                  disabled={movingRoutineTargetIndex === 0}
                  aria-label={t.labels.moveUp}
                >
                  <ArrowUp size={16} />
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => moveRoutineTarget(1)}
                  disabled={movingRoutineTargetIndex === routines.length - 1}
                  aria-label={t.labels.moveDown}
                >
                  <ArrowDown size={16} />
                </Button>
              </div>

              <div className="mt-5 space-y-3">
                <p className="text-sm font-medium text-app-text-muted">{t.labels.movePreview}</p>
                <div className="space-y-2">
                  {movePreviewRoutines.map(({ index, routine, isMoving, isTarget }) => (
                    <ListRow
                      key={`${routine.id}-${index}`}
                      className={cn(
                        'px-4 py-3',
                        isMoving ? 'border-app-accent bg-app-accent/10' : '',
                        isTarget ? 'border-2 border-app-accent ring-2 ring-app-accent' : ''
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-app-text">{index + 1}.</span>
                        <p className="text-sm font-semibold text-app-text">{routine.name}</p>
                      </div>
                    </ListRow>
                  ))}
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-app-border px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
              <div className="flex gap-3">
                <Button onClick={closeMoveRoutine} variant="secondary" className="flex-1">{t.actions.cancel}</Button>
                <Button onClick={applyMoveRoutine} className="flex-1">{t.actions.save}</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {confirmDeleteRoutineId && (
        <ConfirmModal title={t.prompts.confirmDelete} confirmLabel={t.actions.delete} destructive onConfirm={handleConfirmDeleteRoutine} onCancel={() => setConfirmDeleteRoutineId(null)} />
      )}

      {confirmRemoveExerciseId && (
        <ConfirmModal title={t.labels.removeFromRoutine} confirmLabel={t.actions.delete} destructive onConfirm={() => handleRemoveExerciseFromRoutine(confirmRemoveExerciseId)} onCancel={() => setConfirmRemoveExerciseId(null)} />
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
  onTap: () => void;
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
  onTap,
  onToggleAlternative,
}) => {
  const t = useTranslations();
  const handlers = useLongPress({ onLongPress, onTap });

  return (
    <ListRow {...handlers} className="select-none">
      <div className="mb-2 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-app-text">{exercise.name}</h3>
          <p className="mt-0.5 text-xs uppercase tracking-wide text-app-text-muted">{getTranslatedGroupName(exercise.muscleGroup)}</p>
        </div>
        {alternativeExercise && (
          <button onClick={onToggleAlternative} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} className="ml-2 flex-shrink-0 rounded-full border border-app-border bg-app-surface px-2 py-1 text-xs font-semibold text-app-text active:opacity-70">
            <Shuffle size={11} className="inline-block" /> {isUsingAlternative ? t.labels.swapToMain : t.labels.swapToAlternative}
          </button>
        )}
      </div>

      <div className="mb-3 flex items-center gap-2">
        <Badge variant="accent" className="px-2 py-0.5">{routineExercise.reps ? `${routineExercise.sets} sets × ${routineExercise.reps} reps` : `${routineExercise.sets} sets`}</Badge>
        {routineExercise.toFailure && <Badge variant="danger">{t.labels.toFailure}</Badge>}
        {routineExercise.dropset && <Badge variant="warning">{t.labels.dropset}</Badge>}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-app-text-muted">{t.labels.weightShort}</label>
          <Input type="number" inputMode="decimal" value={form.weight} onChange={(e) => onUpdateForm('weight', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} placeholder="0" compact />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-app-text-muted">{t.labels.reps}</label>
          <Input type="number" inputMode="numeric" value={form.reps} onChange={(e) => onUpdateForm('reps', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} placeholder="0" compact />
        </div>
        <div className="flex items-end">
          <Button onClick={onLog} className="w-full">{t.actions.log}</Button>
        </div>
      </div>
    </ListRow>
  );
};
