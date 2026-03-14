import React, { useState, useMemo } from 'react';
import { Plus, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Exercise, Routine, RoutineExercise } from '../types';
import { t, translations } from '../utils/translations';
import { getLatestLog } from '../utils/progression';
import { RoutineCard } from './RoutineCard';

interface Props {
  routines: Routine[];
  exercises: Exercise[];
  onSaveRoutine: (routine: Routine) => void;
  onDeleteRoutine: (id: string) => void;
  onLogExercise: (exerciseId: string, weight: number, reps: number) => void;
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
}) => {
  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);

  const [formName, setFormName] = useState('');
  const [formExercises, setFormExercises] = useState<RoutineExercise[]>([]);

  const [logForms, setLogForms] = useState<Record<string, LogFormState>>({});

  const getTranslatedGroupName = (group: string) => {
    return (translations.es.muscleGroups as Record<string, string>)[group]
      ? (t.muscleGroups as Record<string, string>)[group]
      : group;
  };

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
      }))
      .filter((item): item is { routineExercise: RoutineExercise; exercise: Exercise } =>
        item.exercise !== undefined
      );
  }, [activeRoutine, exercises]);

  const openCreate = () => {
    setFormName('');
    setFormExercises([]);
    setEditingRoutine(null);
    setModalMode('create');
  };

  const openEdit = (routine: Routine) => {
    setFormName(routine.name);
    setFormExercises([...routine.exercises]);
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
      if (exists) {
        return prev.filter((re) => re.exerciseId !== exerciseId);
      }
      return [...prev, { exerciseId, sets: DEFAULT_SETS, reps: DEFAULT_REPS, dropset: false, toFailure: false }];
    });
  };

  const updateFormExerciseField = (
    exerciseId: string,
    field: 'sets' | 'reps',
    value: string
  ) => {
    if (field === 'reps') {
      setFormExercises((prev) =>
        prev.map((re) => (re.exerciseId === exerciseId ? { ...re, reps: value } : re))
      );
    } else {
      setFormExercises((prev) =>
        prev.map((re) => (re.exerciseId === exerciseId ? { ...re, sets: value as unknown as number } : re))
      );
    }
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
      prev.map((re) =>
        re.exerciseId === exerciseId ? { ...re, dropset: !re.dropset } : re
      )
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

  const handleSave = () => {
    const name = formName.trim();
    if (!name) return;
    const routine: Routine = {
      id: editingRoutine?.id ?? Date.now().toString(),
      name,
      exercises: formExercises,
    };
    onSaveRoutine(routine);
    closeModal();
  };

  const handleDelete = (id: string) => {
    if (!window.confirm(t.prompts.confirmDelete)) return;
    onDeleteRoutine(id);
    if (activeRoutineId === id) setActiveRoutineId(null);
  };

  const getLogForm = (exerciseId: string): LogFormState => {
    if (logForms[exerciseId]) return logForms[exerciseId];
    const latest = getLatestLog(exercises.find((e) => e.id === exerciseId)?.logs ?? []);
    return {
      weight: latest ? latest.weight.toString() : '',
      reps: latest ? latest.reps.toString() : '',
    };
  };

  const updateLogForm = (exerciseId: string, field: keyof LogFormState, value: string) => {
    setLogForms((prev) => ({
      ...prev,
      [exerciseId]: { ...getLogForm(exerciseId), [field]: value },
    }));
  };

  const handleLog = (exerciseId: string) => {
    const form = getLogForm(exerciseId);
    const weight = parseFloat(form.weight);
    const reps = parseInt(form.reps, 10);
    if (Number.isNaN(weight) || Number.isNaN(reps)) return;
    onLogExercise(exerciseId, weight, reps);
  };

  if (activeRoutine) {
    return (
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
          <div className="w-16" />
        </div>

        {activeRoutineExercises.length === 0 ? (
          <div className="text-center py-20 opacity-50">
            <p className="text-ios-text font-medium">{t.labels.noExercises}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeRoutineExercises.map(({ routineExercise, exercise }) => {
              const form = getLogForm(exercise.id);
              const latest = getLatestLog(exercise.logs);
              return (
                <div key={exercise.id} className="bg-ios-card rounded-2xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-base font-semibold text-ios-text">{exercise.name}</h3>
                      <p className="text-xs text-ios-gray uppercase tracking-wide mt-0.5">
                        {getTranslatedGroupName(exercise.muscleGroup)}
                      </p>
                    </div>
                    {latest && (
                      <div className="text-right text-xs text-ios-gray">
                        <p>{latest.weight} kg</p>
                        <p>{latest.reps} reps</p>
                      </div>
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
                      <label className="block text-xs font-medium text-ios-gray mb-1">
                        {t.labels.weightShort}
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={form.weight}
                        onChange={(e) => updateLogForm(exercise.id, 'weight', e.target.value)}
                        className="w-full bg-ios-bg text-ios-text p-2 rounded-lg border-none outline-none focus:ring-2 focus:ring-ios-blue text-sm"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ios-gray mb-1">
                        {t.labels.reps}
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={form.reps}
                        onChange={(e) => updateLogForm(exercise.id, 'reps', e.target.value)}
                        className="w-full bg-ios-bg text-ios-text p-2 rounded-lg border-none outline-none focus:ring-2 focus:ring-ios-blue text-sm"
                        placeholder="0"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={() => handleLog(exercise.id)}
                        className="w-full py-2 rounded-lg bg-ios-blue text-white text-sm font-semibold active:opacity-80"
                      >
                        {t.actions.log}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-ios-text">{t.labels.routines}</h1>
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

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
          <div
            className="bg-ios-card w-full max-w-md rounded-t-3xl p-6 shadow-2xl"
            style={{ maxHeight: '85vh', overflowY: 'auto', paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-ios-text">
                {modalMode === 'create' ? t.labels.newRoutine : t.labels.editRoutine}
              </h2>
              <button onClick={closeModal} className="text-ios-gray active:opacity-70">
                <X size={22} />
              </button>
            </div>

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

            <div className="mb-6">
              <label className="block text-xs font-medium text-ios-gray mb-2 uppercase tracking-wide">
                {t.labels.selectExercises}
              </label>
              {exercises.length === 0 ? (
                <p className="text-ios-gray text-sm text-center py-4">{t.labels.noExercisesAvailable}</p>
              ) : (
                <div className="space-y-2">
                  {exercises
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((exercise) => {
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
                              <div className="grid grid-cols-4 gap-2 items-end">
                                <div>
                                  <label className="block text-xs font-medium text-ios-gray mb-1">
                                    {t.labels.sets}
                                  </label>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={routineEx.sets}
                                    onChange={(e) =>
                                      updateFormExerciseField(exercise.id, 'sets', e.target.value)
                                    }
                                    onBlur={(e) => commitSetsField(exercise.id, e.target.value)}
                                    className="w-full bg-ios-card text-ios-text p-2 rounded-lg border-none outline-none focus:ring-2 focus:ring-ios-blue text-sm text-center"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-ios-gray mb-1">
                                    {t.labels.reps}
                                  </label>
                                  <input
                                    type="text"
                                    inputMode="text"
                                    value={routineEx.reps}
                                    onChange={(e) =>
                                      updateFormExerciseField(exercise.id, 'reps', e.target.value)
                                    }
                                    disabled={routineEx.toFailure}
                                    className="w-full bg-ios-card text-ios-text p-2 rounded-lg border-none outline-none focus:ring-2 focus:ring-ios-blue text-sm text-center disabled:opacity-30"
                                    placeholder="10"
                                  />
                                </div>
                                <div className="flex flex-col items-center">
                                  <label className="block text-xs font-medium text-ios-gray mb-1">
                                    {t.labels.dropset}
                                  </label>
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
                                  <label className="block text-xs font-medium text-ios-gray mb-1">
                                    {t.labels.toFailure}
                                  </label>
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
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            <button
              onClick={handleSave}
              disabled={!formName.trim()}
              className="w-full py-3 rounded-xl bg-ios-blue text-white font-semibold text-base active:opacity-80 disabled:opacity-40"
            >
              {t.actions.save}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
