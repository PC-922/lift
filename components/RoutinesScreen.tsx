import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Pencil, X, ArrowUp, ArrowDown, Shuffle, Plus, MoreVertical, Trash2 } from 'lucide-react';
import { Exercise, Routine, RoutineDay, RoutineExercise, ExerciseLog } from '../types';
import { useTranslations, getTranslatedGroupName } from '../utils/translations';
import { getLatestLog, getLogFeedback } from '../utils/progression';
import { RoutineCard } from './RoutineCard';
import { RoutineDayCard } from './RoutineDayCard';
import { ActionSheet } from './ActionSheet';
import ConfirmModal from './ConfirmModal';
import { Modal } from './Modal';
import { useToast } from '../hooks/useToast';
import { makeId } from '../services/storageService';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Input } from './ui/Input';
import { SearchInput } from './ui/SearchInput';
import { ListRow } from './ui/ListRow';
import { BackButton } from './ui/BackButton';
import { IconButton } from './ui/IconButton';
import { cn } from '../utils/cn';

interface Props {
  routines: Routine[];
  exercises: Exercise[];
  muscleGroups: string[];
  activeRoutineId: string | null;
  onActiveRoutineChange: (id: string | null) => void;
  onSaveRoutine: (routine: Routine) => void;
  onDeleteRoutine: (id: string) => void;
  onLogExercise: (exerciseId: string, weight: number | null, reps: number | null) => void;
  onReorderRoutine: (from: number, to: number) => void;
  onReorderRoutineExercise: (routineId: string, dayId: string, from: number, to: number) => void;
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

interface ExerciseDayRef {
  exerciseId: string;
  dayId: string;
}

const DEFAULT_SETS = 3;
const DEFAULT_REPS = '10';
const DEFAULT_REST_SECONDS = 90;

function makeDefaultDay(name?: string): RoutineDay {
  return { id: makeId('day'), name: name ?? 'Día 1', exercises: [] };
}

function getDayMuscleGroups(day: RoutineDay, exercises: Exercise[]): string[] {
  const groups = new Set<string>();
  day.exercises.forEach((re) => {
    const exercise = exercises.find((e) => e.id === re.exerciseId);
    if (exercise) groups.add(exercise.muscleGroup);
  });
  return Array.from(groups);
}

export const RoutinesScreen: React.FC<Props> = ({
  routines,
  exercises,
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
  const [formDays, setFormDays] = useState<RoutineDay[]>([]);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [formSearch, setFormSearch] = useState('');
  const [logForms, setLogForms] = useState<Record<string, LogFormState>>({});
  const [usingAlternative, setUsingAlternative] = useState<Record<string, boolean>>({});
  const [actionSheetExercise, setActionSheetExercise] = useState<ExerciseDayRef | null>(null);
  const [confirmDeleteRoutineId, setConfirmDeleteRoutineId] = useState<string | null>(null);
  const [confirmRemoveExercise, setConfirmRemoveExercise] = useState<ExerciseDayRef | null>(null);
  const [pickingAlternativeFor, setPickingAlternativeFor] = useState<ExerciseDayRef | null>(null);
  const [alternativeSearch, setAlternativeSearch] = useState('');
  const [movingExercise, setMovingExercise] = useState<{ ref: ExerciseDayRef; targetIndex: number } | null>(null);
  const [movingRoutineId, setMovingRoutineId] = useState<string | null>(null);
  const [movingRoutineTargetIndex, setMovingRoutineTargetIndex] = useState<number>(0);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  useEffect(() => {
    setModalMode(null);
    setSelectedDayId(null);
  }, [resetSignal]);

  useEffect(() => {
    setSelectedDayId(null);
  }, [activeRoutineId]);

  const { showToast } = useToast();

  const activeRoutine = useMemo(() => routines.find((r) => r.id === activeRoutineId) ?? null, [routines, activeRoutineId]);
  const exerciseById = useMemo(() => new Map(exercises.map((exercise) => [exercise.id, exercise] as const)), [exercises]);

  const activeRoutineDays = useMemo(() => {
    if (!activeRoutine) return [];
    return activeRoutine.days.map((day) => ({
      ...day,
      resolved: day.exercises
        .map((re) => ({
          routineExercise: re,
          exercise: exercises.find((e) => e.id === re.exerciseId),
          alternativeExercise: re.alternativeExerciseId ? exercises.find((e) => e.id === re.alternativeExerciseId) : undefined,
        }))
        .filter((item): item is { routineExercise: RoutineExercise; exercise: Exercise; alternativeExercise: Exercise | undefined } => item.exercise !== undefined),
      muscleGroups: getDayMuscleGroups(day, exercises),
    }));
  }, [activeRoutine, exercises]);

  const selectedDay = useMemo(
    () => activeRoutineDays.find((day) => day.id === selectedDayId) ?? null,
    [activeRoutineDays, selectedDayId]
  );

  const openCreate = () => {
    setFormName('');
    setFormDays([makeDefaultDay(t.labels.day + ' 1')]);
    setActiveDayIndex(0);
    setFormSearch('');
    setEditingRoutine(null);
    setModalMode('create');
  };

  const openEdit = (routine: Routine) => {
    setFormName(routine.name);
    setFormDays(routine.days.map((day) => ({ ...day, exercises: day.exercises.map((re) => ({ ...re })) })));
    setActiveDayIndex(0);
    setFormSearch('');
    setEditingRoutine(routine);
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingRoutine(null);
  };

  const activeFormDay = formDays[activeDayIndex];

  const addDay = () => {
    const nextNumber = formDays.length + 1;
    setFormDays((prev) => [...prev, makeDefaultDay(`${t.labels.day} ${nextNumber}`)]);
    setActiveDayIndex(formDays.length);
  };

  const removeDay = (index: number) => {
    if (formDays.length <= 1) return;
    setFormDays((prev) => prev.filter((_, i) => i !== index));
    setActiveDayIndex((current) => Math.min(current, formDays.length - 2));
  };

  const updateDayName = (index: number, name: string) => {
    setFormDays((prev) => prev.map((day, i) => (i === index ? { ...day, name } : day)));
  };

  const updateFormDays = (updater: (days: RoutineDay[]) => RoutineDay[]) => {
    setFormDays((prev) => updater(prev.map((day) => ({ ...day, exercises: day.exercises.map((re) => ({ ...re })) }))));
  };

  const toggleExercise = (exerciseId: string) => {
    if (!activeFormDay) return;
    setFormDays((prev) => prev.map((day, i) => {
      if (i !== activeDayIndex) return day;
      const exists = day.exercises.find((re) => re.exerciseId === exerciseId);
      if (exists) {
        return { ...day, exercises: day.exercises.filter((re) => re.exerciseId !== exerciseId) };
      }
      return {
        ...day,
        exercises: [...day.exercises, {
          exerciseId,
          sets: DEFAULT_SETS,
          reps: DEFAULT_REPS,
          dropset: false,
          toFailure: false,
          restSeconds: DEFAULT_REST_SECONDS,
        }],
      };
    }));
  };

  const updateFormExerciseField = (exerciseId: string, field: 'sets' | 'reps' | 'restSeconds', value: string) => {
    if (!activeFormDay) return;
    setFormDays((prev) => prev.map((day, i) => {
      if (i !== activeDayIndex) return day;
      return {
        ...day,
        exercises: day.exercises.map((re) => (re.exerciseId === exerciseId ? { ...re, [field]: value } : re)),
      };
    }));
  };

  const commitSetsField = (exerciseId: string, value: string) => {
    if (!activeFormDay) return;
    const parsed = parseInt(value, 10);
    const num = Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;
    setFormDays((prev) => prev.map((day, i) => {
      if (i !== activeDayIndex) return day;
      return { ...day, exercises: day.exercises.map((re) => (re.exerciseId === exerciseId ? { ...re, sets: num } : re)) };
    }));
  };

  const commitRestField = (exerciseId: string, value: string) => {
    if (!activeFormDay) return;
    const parsed = parseInt(value, 10);
    const num = Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
    setFormDays((prev) => prev.map((day, i) => {
      if (i !== activeDayIndex) return day;
      return { ...day, exercises: day.exercises.map((re) => (re.exerciseId === exerciseId ? { ...re, restSeconds: num } : re)) };
    }));
  };

  const toggleDropset = (exerciseId: string) => {
    if (!activeFormDay) return;
    setFormDays((prev) => prev.map((day, i) => {
      if (i !== activeDayIndex) return day;
      return { ...day, exercises: day.exercises.map((re) => (re.exerciseId === exerciseId ? { ...re, dropset: !re.dropset } : re)) };
    }));
  };

  const toggleToFailure = (exerciseId: string) => {
    if (!activeFormDay) return;
    setFormDays((prev) => prev.map((day, i) => {
      if (i !== activeDayIndex) return day;
      return {
        ...day,
        exercises: day.exercises.map((re) => {
          if (re.exerciseId !== exerciseId) return re;
          const next = !re.toFailure;
          return { ...re, toFailure: next, reps: next ? '' : DEFAULT_REPS };
        }),
      };
    }));
  };

  const setAlternative = (exerciseId: string, alternativeId: string | undefined) => {
    if (!activeFormDay) return;
    setFormDays((prev) => prev.map((day, i) => {
      if (i !== activeDayIndex) return day;
      return { ...day, exercises: day.exercises.map((re) => (re.exerciseId === exerciseId ? { ...re, alternativeExerciseId: alternativeId } : re)) };
    }));
  };

  const handleSave = () => {
    const name = formName.trim();
    if (!name || formDays.length === 0) return;
    onSaveRoutine({ id: editingRoutine?.id ?? makeId('routine'), name, days: formDays });
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
    onSaveRoutine({ id: makeId('routine'), name: `${routine.name} (2)`, days: routine.days.map((day) => ({ ...day, id: makeId('day'), exercises: day.exercises.map((re) => ({ ...re })) })) });
  };

  const getLogForm = useCallback(
    (exerciseId: string): LogFormState => {
      if (logForms[exerciseId]) return logForms[exerciseId];
      const latest = getLatestLog(exerciseById.get(exerciseId)?.logs ?? []);
      return { weight: latest?.weight?.toString() ?? '', reps: latest?.reps?.toString() ?? '' };
    },
    [logForms, exerciseById]
  );

  const updateLogForm = (exerciseId: string, field: keyof LogFormState, value: string) => {
    setLogForms((prev) => ({ ...prev, [exerciseId]: { ...getLogForm(exerciseId), [field]: value } }));
  };

  const handleLog = (targetId: string) => {
    const form = getLogForm(targetId);
    const weightValue = form.weight.trim() === '' ? null : parseFloat(form.weight);
    const repsValue = form.reps.trim() === '' ? null : parseInt(form.reps, 10);
    if (weightValue === null && repsValue === null) return;
    if ((weightValue !== null && Number.isNaN(weightValue)) || (repsValue !== null && Number.isNaN(repsValue))) return;

    const targetExercise = exerciseById.get(targetId);
    const latest = getLatestLog(targetExercise?.logs ?? []);
    const isFirst = (targetExercise?.logs ?? []).length === 0;
    const prevWeight = latest?.weight ?? null;
    const prevReps = latest?.reps ?? null;

    onLogExercise(targetId, weightValue, repsValue);
    setLogForms((prev) => {
      const next = { ...prev };
      delete next[targetId];
      return next;
    });

    const feedback = getLogFeedback(weightValue, repsValue, prevWeight, prevReps, isFirst);
    if (feedback) {
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
    }
  };

  const openMoveExercise = (ref: ExerciseDayRef) => {
    const day = activeRoutine?.days.find((d) => d.id === ref.dayId);
    if (!day) return;
    const idx = day.exercises.findIndex((re) => re.exerciseId === ref.exerciseId);
    if (idx === -1) return;
    setMovingExercise({ ref, targetIndex: idx });
  };

  const closeMoveExercise = () => setMovingExercise(null);

  const moveExerciseTarget = (direction: -1 | 1) => {
    const day = activeRoutine?.days.find((d) => d.id === movingExercise?.ref.dayId);
    if (!day) return;
    setMovingExercise((current) => {
      if (!current) return null;
      return { ...current, targetIndex: Math.max(0, Math.min(day.exercises.length - 1, current.targetIndex + direction)) };
    });
  };

  const applyMoveExercise = () => {
    if (!activeRoutine || !movingExercise) return;
    const day = activeRoutine.days.find((d) => d.id === movingExercise.ref.dayId);
    if (!day) return;
    const fromIndex = day.exercises.findIndex((re) => re.exerciseId === movingExercise.ref.exerciseId);
    if (fromIndex === -1 || fromIndex === movingExercise.targetIndex) {
      closeMoveExercise();
      return;
    }
    onReorderRoutineExercise(activeRoutine.id, movingExercise.ref.dayId, fromIndex, movingExercise.targetIndex);
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

  const handleRemoveExerciseFromRoutine = (ref: ExerciseDayRef) => {
    if (!activeRoutine) return;
    onSaveRoutine({
      ...activeRoutine,
      days: activeRoutine.days.map((day) =>
        day.id === ref.dayId
          ? { ...day, exercises: day.exercises.filter((re) => re.exerciseId !== ref.exerciseId) }
          : day
      ),
    });
    setConfirmRemoveExercise(null);
  };

  const filteredFormExercises = useMemo(() => {
    const q = formSearch.toLowerCase();
    return exercises.slice().sort((a, b) => a.name.localeCompare(b.name)).filter((ex) => !q || ex.name.toLowerCase().includes(q));
  }, [exercises, formSearch]);

  const filteredAlternativeExercises = useMemo(() => {
    const q = alternativeSearch.toLowerCase();
    return exercises.slice().sort((a, b) => a.name.localeCompare(b.name)).filter((ex) => !q || ex.name.toLowerCase().includes(q));
  }, [exercises, alternativeSearch]);

  const actionSheetExerciseName = actionSheetExercise ? exerciseById.get(actionSheetExercise.exerciseId)?.name ?? '' : '';
  const movingExerciseDay = movingExercise ? activeRoutine?.days.find((d) => d.id === movingExercise.ref.dayId) : undefined;
  const movingExerciseIndex = movingExercise ? movingExerciseDay?.exercises.findIndex((re) => re.exerciseId === movingExercise.ref.exerciseId) ?? -1 : -1;
  const movingExerciseName = movingExercise ? exerciseById.get(movingExercise.ref.exerciseId)?.name ?? '' : '';

  const movePreviewExercises = useMemo(() => {
    if (!movingExerciseDay || !movingExercise || movingExerciseIndex === -1) return [];

    const reordered = [...movingExerciseDay.exercises]
      .map((routineExercise) => ({
        routineExercise,
        exercise: exerciseById.get(routineExercise.exerciseId),
      }))
      .filter((item): item is { routineExercise: RoutineExercise; exercise: Exercise } => item.exercise !== undefined);

    const movingIndex = reordered.findIndex((item) => item.routineExercise.exerciseId === movingExercise.ref.exerciseId);
    if (movingIndex === -1) return [];
    const [movingItem] = reordered.splice(movingIndex, 1);
    reordered.splice(movingExercise.targetIndex, 0, movingItem);

    return reordered.map((item, index) => ({
      index,
      routineExercise: item.routineExercise,
      exercise: item.exercise,
      isMovingExercise: item.routineExercise.exerciseId === movingExercise.ref.exerciseId,
      isTarget: index === movingExercise.targetIndex,
    }));
  }, [movingExerciseDay, movingExercise, movingExerciseIndex, exerciseById]);

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

  const pickingAlternativeExerciseId = pickingAlternativeFor?.exerciseId ?? null;

  return (
    <div className="space-y-6 pb-20">
      {activeRoutine ? (
        <div className="space-y-4">
          {selectedDay ? (
            <div className="mb-6">
              <BackButton label={activeRoutine.name} onClick={() => setSelectedDayId(null)} />
            </div>
          ) : (
            <div className="mb-6">
              <BackButton label={t.labels.routines} onClick={() => onActiveRoutineChange(null)} />
            </div>
          )}
          <div className="mb-2 flex items-center justify-between">
            <h1 className="text-xl font-bold text-app-text">{selectedDay ? selectedDay.name : activeRoutine.name}</h1>
            {!selectedDay && (
              <button onClick={() => openEdit(activeRoutine)} className="p-1 text-app-text active:opacity-70" aria-label={t.actions.edit}>
                <Pencil size={18} />
              </button>
            )}
          </div>

          {activeRoutineDays.length === 0 ? (
            <div className="py-20 text-center opacity-60">
              <p className="font-medium text-app-text">{t.labels.noExercises}</p>
            </div>
          ) : selectedDay ? (
            <div className="space-y-3 pb-32">
              {selectedDay.resolved.map(({ routineExercise, exercise, alternativeExercise }) => {
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
                    onMenu={() => setActionSheetExercise({ exerciseId: exercise.id, dayId: selectedDay.id })}
                    onTap={() => onNavigateToExercise(displayExercise.id, activeRoutine.id)}
                    onToggleAlternative={() => setUsingAlternative((prev) => ({ ...prev, [exercise.id]: !prev[exercise.id] }))}
                    onSetAlternative={() => { setPickingAlternativeFor({ exerciseId: exercise.id, dayId: selectedDay.id }); setAlternativeSearch(''); }}
                  />
                );
              })}
            </div>
          ) : (
            <div className="space-y-3 pb-32">
              {activeRoutineDays.map((day) => (
                <RoutineDayCard
                  key={day.id}
                  name={day.name}
                  exerciseCount={day.resolved.length}
                  muscleGroups={day.muscleGroups}
                  onClick={() => setSelectedDayId(day.id)}
                />
              ))}
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

          <div className="shrink-0 border-b border-app-border px-6 py-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {formDays.map((day, index) => (
                  <button
                    key={day.id}
                    onClick={() => setActiveDayIndex(index)}
                    className={cn(
                      'shrink-0 rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
                      activeDayIndex === index
                        ? 'border-app-accent bg-app-accent text-app-accent-foreground'
                        : 'border-app-border bg-app-surface text-app-text'
                    )}
                  >
                    {day.name}
                  </button>
                ))}
                <Button variant="secondary" onClick={addDay} className="shrink-0 px-3 py-2 text-sm">
                  <Plus size={14} />
                  {t.labels.addDay}
                </Button>
              </div>

              {activeFormDay && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={activeFormDay.name}
                      onChange={(e) => updateDayName(activeDayIndex, e.target.value)}
                      placeholder={t.labels.dayName}
                      className="flex-1"
                    />
                    {formDays.length > 1 && (
                      <IconButton onClick={() => removeDay(activeDayIndex)} aria-label={t.labels.removeDay} className="shrink-0 text-app-danger">
                        <Trash2 size={18} />
                      </IconButton>
                    )}
                  </div>
                </div>
              )}
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
                    const routineEx = activeFormDay?.exercises.find((re) => re.exerciseId === exercise.id);
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
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                              <div className="space-y-1">
                                <label className="block text-xs font-medium text-app-text-muted">{t.labels.sets}</label>
                                <Input compact type="text" inputMode="numeric" value={routineEx.sets} onChange={(e) => updateFormExerciseField(exercise.id, 'sets', e.target.value)} onBlur={(e) => commitSetsField(exercise.id, e.target.value)} className="text-center" />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-xs font-medium text-app-text-muted">{t.labels.reps}</label>
                                <Input compact type="text" inputMode="text" value={routineEx.reps} onChange={(e) => updateFormExerciseField(exercise.id, 'reps', e.target.value)} disabled={routineEx.toFailure} className="text-center disabled:opacity-30" placeholder="10" />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-xs font-medium text-app-text-muted">{t.labels.rest}</label>
                                <Input compact type="text" inputMode="numeric" value={routineEx.restSeconds ?? ''} onChange={(e) => updateFormExerciseField(exercise.id, 'restSeconds', e.target.value)} onBlur={(e) => commitRestField(exercise.id, e.target.value)} className="text-center" placeholder="90" />
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
                                <button onClick={() => { setPickingAlternativeFor({ exerciseId: exercise.id, dayId: activeFormDay?.id ?? '' }); setAlternativeSearch(''); }} className="flex items-center gap-1 text-xs font-medium text-app-text underline decoration-app-accent decoration-2 underline-offset-4 active:opacity-70">
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
              {filteredAlternativeExercises.filter((ex) => ex.id !== pickingAlternativeExerciseId).map((ex) => (
                <ListRow key={ex.id} padded={false}>
                  <button onClick={() => { if (pickingAlternativeFor) setAlternative(pickingAlternativeFor.exerciseId, ex.id); setPickingAlternativeFor(null); }} className="w-full px-4 py-4 text-left transition-colors active:bg-app-surface-muted sm:px-5 sm:py-5">
                    <p className="text-sm font-semibold text-app-text">{ex.name}</p>
                    <p className="text-xs text-app-text-muted">{getTranslatedGroupName(ex.muscleGroup)}</p>
                  </button>
                </ListRow>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {actionSheetExercise && (
        <ActionSheet
          title={actionSheetExerciseName}
          actions={[
            { label: t.labels.move, onPress: () => { openMoveExercise(actionSheetExercise); setActionSheetExercise(null); } },
            { label: t.labels.removeFromRoutine, destructive: true, onPress: () => { setConfirmRemoveExercise(actionSheetExercise); setActionSheetExercise(null); } },
          ]}
          onClose={() => setActionSheetExercise(null)}
        />
      )}

      <Modal open={!!movingExercise} onClose={closeMoveExercise} position="bottom" blurBackdrop={false}>
        {movingExercise && movingExerciseDay && (
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
              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => moveExerciseTarget(-1)}
                  disabled={movingExercise.targetIndex === 0}
                  aria-label={t.labels.moveUp}
                >
                  <ArrowUp size={16} />
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => moveExerciseTarget(1)}
                  disabled={!movingExerciseDay.exercises.length || movingExercise.targetIndex === movingExerciseDay.exercises.length - 1}
                  aria-label={t.labels.moveDown}
                >
                  <ArrowDown size={16} />
                </Button>
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

      {confirmRemoveExercise && (
        <ConfirmModal title={t.labels.removeFromRoutine} confirmLabel={t.actions.delete} destructive onConfirm={() => handleRemoveExerciseFromRoutine(confirmRemoveExercise)} onCancel={() => setConfirmRemoveExercise(null)} />
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
  onTap: () => void;
  onMenu: () => void;
  onToggleAlternative: () => void;
  onSetAlternative: () => void;
}

const RoutineExerciseCard: React.FC<RoutineExerciseCardProps> = ({
  routineExercise,
  exercise,
  alternativeExercise,
  isUsingAlternative,
  form,
  onUpdateForm,
  onLog,
  onTap,
  onMenu,
  onToggleAlternative,
  onSetAlternative,
}) => {
  const t = useTranslations();

  return (
    <ListRow className="select-none p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1" onClick={onTap}>
          <h3 className="text-lg font-bold text-app-text leading-tight">{exercise.name}</h3>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-app-text-muted">
            {getTranslatedGroupName(exercise.muscleGroup)}
          </p>
        </div>
        <IconButton
          onClick={(e) => { e.stopPropagation(); onMenu(); }}
          aria-label="Menu"
          className="shrink-0 -mr-2 -mt-2"
        >
          <MoreVertical size={18} />
        </IconButton>
      </div>

      {exercise.note && (
        <p className="text-xs text-app-text-muted italic">{exercise.note}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="accent" className="rounded-md px-2 py-1 text-[11px] font-black uppercase tracking-wider bg-app-accent text-app-accent-foreground shadow-sm border-none">
          {routineExercise.reps ? `${routineExercise.sets} sets × ${routineExercise.reps} reps` : `${routineExercise.sets} sets`}
        </Badge>
        {routineExercise.toFailure && <Badge variant="danger">{t.labels.toFailure}</Badge>}
        {routineExercise.dropset && <Badge variant="warning">{t.labels.dropset}</Badge>}
        {typeof routineExercise.restSeconds === 'number' && routineExercise.restSeconds > 0 && (
          <Badge variant="neutral" className="text-[10px]">
            {t.labels.rest}: {routineExercise.restSeconds}{t.labels.restSeconds}
          </Badge>
        )}
        {alternativeExercise && (
          <button
            onClick={onToggleAlternative}
            className="rounded-md border border-app-border bg-app-surface-muted px-2 py-1 text-xs font-semibold text-app-text active:opacity-70 transition-colors"
          >
            <Shuffle size={12} className="inline-block mr-1" />
            {isUsingAlternative ? t.labels.swapToMain : t.labels.swapToAlternative}
          </button>
        )}
        {!alternativeExercise && (
          <button
            onClick={onSetAlternative}
            className="rounded-md border border-dashed border-app-border bg-app-surface px-2 py-1 text-xs font-semibold text-app-text-muted active:opacity-70 transition-colors"
          >
            <Shuffle size={12} className="inline-block mr-1" />
            {t.labels.setAlternative}
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 items-end">
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase text-app-text-muted">{t.labels.weightShort}</label>
          <Input
            type="text"
            inputMode="decimal"
            value={form.weight}
            onChange={(e) => onUpdateForm('weight', e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            placeholder="0"
            className="font-mono text-center font-bold"
            compact
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase text-app-text-muted">{t.labels.reps}</label>
          <Input
            type="text"
            inputMode="numeric"
            value={form.reps}
            onChange={(e) => onUpdateForm('reps', e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            placeholder="0"
            className="font-mono text-center font-bold"
            compact
          />
        </div>
        <div>
          <Button onClick={onLog} variant="primary" className="w-full font-black text-sm h-10 shadow-sm">
            {t.actions.log}
          </Button>
        </div>
      </div>
    </ListRow>
  );
};
