import React, {forwardRef, useCallback, useEffect, useMemo, useState} from 'react';
import {GripVertical, MoreVertical, Pencil, Play, Plus, Trash2, Upload, X} from 'lucide-react';
import {Exercise, ExerciseLog, Routine, RoutineDay, RoutineExercise} from '../types';
import {getTranslatedGroupName, useTranslations} from '../utils/translations';
import {getLatestLog, getLogFeedback} from '../utils/progression';
import {RoutineCard} from './RoutineCard';
import {RoutineDayCard} from './RoutineDayCard';
import {ActionSheet} from './ActionSheet';
import ConfirmModal from './ConfirmModal';
import {Modal} from './Modal';
import {useToast} from '../hooks/useToast';
import {useDragReorder} from '../hooks/useDragReorder';
import {makeId} from '@/services/storage/id.ts';
import {Button} from './ui/Button';
import {Badge} from './ui/Badge';
import {Input} from './ui/Input';
import {SearchInput} from './ui/SearchInput';
import {ListRow} from './ui/ListRow';
import {BackButton} from './ui/BackButton';
import {IconButton} from './ui/IconButton';
import {cn} from '../utils/cn';

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
  onShareRoutine: (routine: Routine) => void;
  onImportRoutine: (file: File) => Promise<boolean>;
  onStartWorkout?: (routine: Routine, dayId: string) => void;
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
  onNavigateToExercise,
  onShareRoutine,
  onImportRoutine,
  onStartWorkout,
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
  const [actionSheetExercise, setActionSheetExercise] = useState<ExerciseDayRef | null>(null);
  const [confirmDeleteRoutineId, setConfirmDeleteRoutineId] = useState<string | null>(null);
  const [confirmRemoveExercise, setConfirmRemoveExercise] = useState<ExerciseDayRef | null>(null);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
  const routinesDrag = useDragReorder(routines, onReorderRoutine, (routine: Routine) => routine.id);

  const activeRoutineDays = useMemo(() => {
    if (!activeRoutine) return [];
    return activeRoutine.days.map((day) => ({
      ...day,
      resolved: day.exercises
        .map((re) => ({
          routineExercise: re,
          exercise: exercises.find((e) => e.id === re.exerciseId),
        }))
        .filter((item): item is { routineExercise: RoutineExercise; exercise: Exercise } => item.exercise !== undefined),
      muscleGroups: getDayMuscleGroups(day, exercises),
    }));
  }, [activeRoutine, exercises]);

  const selectedDay = useMemo(
    () => activeRoutineDays.find((day) => day.id === selectedDayId) ?? null,
    [activeRoutineDays, selectedDayId]
  );
  const selectedDayExercises = selectedDay ? selectedDay.resolved : [];
  const exercisesDrag = useDragReorder(
    selectedDayExercises,
    (from, to) => {
      if (!activeRoutine || !selectedDay) return;
      onReorderRoutineExercise(activeRoutine.id, selectedDay.id, from, to);
    },
    (item: { routineExercise: RoutineExercise }) => item.routineExercise.exerciseId
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

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const success = await onImportRoutine(file);
    if (success) {
      showToast(t.labels.importRoutineSuccess, 'achievement');
    } else {
      showToast(t.labels.importRoutineError, 'regression');
    }
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
    if (value !== '' && value !== '-' && !/^-?\d+$/.test(value)) return;
    setLogForms((prev) => ({ ...prev, [exerciseId]: { ...getLogForm(exerciseId), [field]: value } }));
  };

  const handleLog = (targetId: string) => {
    const form = getLogForm(targetId);
    const weightValue = form.weight.trim() === '' || form.weight === '-' ? null : parseInt(form.weight, 10);
    const repsValue = form.reps.trim() === '' || form.reps === '-' ? null : parseInt(form.reps, 10);
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
    const selectedOrder = new Map<string, number>(
      (activeFormDay?.exercises.map((re, index) => [re.exerciseId, index] as const) ?? [])
    );
    return exercises
      .filter((ex) => !q || ex.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const aIndex = selectedOrder.get(a.id);
        const bIndex = selectedOrder.get(b.id);
        if (aIndex !== undefined && bIndex !== undefined) return aIndex - bIndex;
        if (aIndex !== undefined) return -1;
        if (bIndex !== undefined) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [exercises, formSearch, activeFormDay]);

  const actionSheetExerciseName = actionSheetExercise ? exerciseById.get(actionSheetExercise.exerciseId)?.name ?? '' : '';

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

          {selectedDay && onStartWorkout && (
            <Button
              onClick={() => onStartWorkout(activeRoutine, selectedDay.id)}
              size="lg"
              className="mb-4 w-full gap-2"
            >
              <Play size={18} strokeWidth={3} />
              {t.actions.startWorkout}
            </Button>
          )}

          {activeRoutineDays.length === 0 ? (
            <div className="py-20 text-center opacity-60">
              <p className="font-medium text-app-text">{t.labels.noExercises}</p>
            </div>
          ) : selectedDay ? (
            <div className="space-y-3 pb-32">
              {selectedDay.resolved.map(({ routineExercise, exercise }, index) => {
                const form = getLogForm(exercise.id);
                const exerciseId = exercise.id;

                return (
                  <React.Fragment key={exerciseId}>
                    {exercisesDrag.dropIndicatorIndex === index && (
                      <div className="h-1 rounded-full bg-app-accent" aria-hidden="true" />
                    )}
                    <RoutineExerciseCard
                      ref={exercisesDrag.bindItem(exerciseId).ref}
                      routineExercise={routineExercise}
                      exercise={exercise}
                      isDragging={exercisesDrag.draggingId === exerciseId}
                      form={form}
                      onUpdateForm={(field, value) => updateLogForm(exercise.id, field, value)}
                      onLog={() => handleLog(exercise.id)}
                      onMenu={() => setActionSheetExercise({ exerciseId, dayId: selectedDay.id })}
                      onDragHandlePointerDown={exercisesDrag.handleStart(exerciseId)}
                      onTap={() => onNavigateToExercise(exercise.id, activeRoutine.id)}
                    />
                  </React.Fragment>
                );
              })}
              {exercisesDrag.dropIndicatorIndex === selectedDay.resolved.length && (
                <div className="h-1 rounded-full bg-app-accent" aria-hidden="true" />
              )}
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

          <div className="flex gap-3">
            <Button onClick={openCreate} className="flex-1">
              <Plus size={18} />
              {t.labels.newRoutine}
            </Button>
            <Button onClick={handleImportClick} variant="secondary" aria-label={t.actions.importRoutine}>
              <Upload size={18} />
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleFileSelected}
            aria-label={t.actions.importRoutine}
            data-testid="import-routine-input"
          />

          {routines.length === 0 ? (
            <div className="py-20 text-center opacity-60">
              <p className="font-medium text-app-text">{t.labels.noRoutines}</p>
              <p className="mt-2 text-sm text-app-text-muted">{t.labels.noRoutinesDesc}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {routines.map((routine, index) => (
                <React.Fragment key={routine.id}>
                  {routinesDrag.dropIndicatorIndex === index && (
                    <div className="h-1 rounded-full bg-app-accent" aria-hidden="true" />
                  )}
                  <RoutineCard
                    ref={routinesDrag.bindItem(routine.id).ref}
                    routine={routine}
                    isDragging={routinesDrag.draggingId === routine.id}
                    onClick={() => onActiveRoutineChange(routine.id)}
                    onEdit={() => openEdit(routine)}
                    onDelete={() => handleDelete(routine.id)}
                    onDuplicate={() => handleDuplicate(routine)}
                    onShare={() => onShareRoutine(routine)}
                    onDragHandlePointerDown={routinesDrag.handleStart(routine.id)}
                  />
                </React.Fragment>
              ))}
              {routinesDrag.dropIndicatorIndex === routines.length && (
                <div className="h-1 rounded-full bg-app-accent" aria-hidden="true" />
              )}
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
                      'shrink-0 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                      activeDayIndex === index
                        ? 'border-app-text bg-app-text text-app-surface'
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
                            'w-full rounded-xl border p-4 text-left transition-colors active:opacity-70',
                            selected ? 'border-app-text bg-app-surface-muted' : 'border-app-border bg-app-surface'
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

      {actionSheetExercise && (
        <ActionSheet
          title={actionSheetExerciseName}
          actions={[
            { label: t.labels.removeFromRoutine, destructive: true, onPress: () => { setConfirmRemoveExercise(actionSheetExercise); setActionSheetExercise(null); } },
          ]}
          onClose={() => setActionSheetExercise(null)}
        />
      )}

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
  isDragging: boolean;
  form: LogFormState;
  onUpdateForm: (field: keyof LogFormState, value: string) => void;
  onLog: () => void;
  onTap: () => void;
  onMenu: () => void;
  onDragHandlePointerDown: (event: React.PointerEvent) => void;
}

const RoutineExerciseCard = forwardRef<HTMLDivElement, RoutineExerciseCardProps>(
  ({
    routineExercise,
    exercise,
    isDragging,
    form,
    onUpdateForm,
    onLog,
    onTap,
    onMenu,
    onDragHandlePointerDown,
  }, ref) => {
    const t = useTranslations();

    return (
      <ListRow ref={ref} className="select-none p-5 flex flex-col gap-4" style={isDragging ? { opacity: 0.5 } : undefined}>
        <div className="flex items-start justify-between gap-3">
          <button
            onPointerDown={onDragHandlePointerDown}
            className="touch-none p-2 text-app-text-muted active:text-app-text -ml-2 -mt-2"
            aria-label={t.labels.dragToReorder}
          >
            <GripVertical size={18} />
          </button>
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
        <Badge variant="neutral" className="text-[11px] font-semibold">
          {routineExercise.reps ? `${routineExercise.sets} sets × ${routineExercise.reps} reps` : `${routineExercise.sets} sets`}
        </Badge>
        {routineExercise.toFailure && <Badge variant="danger">{t.labels.toFailure}</Badge>}
        {routineExercise.dropset && <Badge variant="warning">{t.labels.dropset}</Badge>}
        {typeof routineExercise.restSeconds === 'number' && routineExercise.restSeconds > 0 && (
          <Badge variant="neutral" className="text-[10px]">
            {t.labels.rest}: {routineExercise.restSeconds}{t.labels.restSeconds}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 items-end">
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase text-app-text-muted">{t.labels.weightShort}</label>
          <Input
            type="text"
            inputMode="text"
            value={form.weight}
            onChange={(e) => onUpdateForm('weight', e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            placeholder="0"
            className="tabular-nums text-center font-bold"
            compact
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase text-app-text-muted">{t.labels.reps}</label>
          <Input
            type="text"
            inputMode="text"
            value={form.reps}
            onChange={(e) => onUpdateForm('reps', e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            placeholder="0"
            className="tabular-nums text-center font-bold"
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
});

RoutineExerciseCard.displayName = 'RoutineExerciseCard';
