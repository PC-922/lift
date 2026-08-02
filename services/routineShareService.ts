import { Exercise, Routine, RoutineDay, RoutineExercise } from '../types';
import { makeId } from './storage/id';

export interface SharedRoutineExercise {
  name: string;
  muscleGroup: string;
  sets: number;
  reps: string;
  dropset: boolean;
  toFailure: boolean;
  alternativeName?: string;
  alternativeMuscleGroup?: string;
  restSeconds?: number;
}

export interface SharedRoutineDay {
  name: string;
  exercises: SharedRoutineExercise[];
}

export interface SharedRoutine {
  version: number;
  name: string;
  days: SharedRoutineDay[];
}

export interface RoutineImportResult {
  routine: Routine;
  createdExercises: Exercise[];
}

function buildExerciseKey(name: string, muscleGroup: string): string {
  return `${name.trim().toLowerCase()}|${muscleGroup.trim().toLowerCase()}`;
}

export function createSharedRoutine(routine: Routine, exercises: Exercise[]): SharedRoutine {
  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));

  const sharedDays = routine.days.map((day) => ({
    name: day.name,
    exercises: day.exercises.map((re) => {
      const exercise = exerciseById.get(re.exerciseId);
      const alternative = re.alternativeExerciseId ? exerciseById.get(re.alternativeExerciseId) : undefined;

      return {
        name: exercise?.name ?? '',
        muscleGroup: exercise?.muscleGroup ?? '',
        sets: re.sets,
        reps: re.reps,
        dropset: re.dropset,
        toFailure: re.toFailure,
        alternativeName: alternative?.name,
        alternativeMuscleGroup: alternative?.muscleGroup,
        restSeconds: re.restSeconds,
      };
    }),
  }));

  return {
    version: 1,
    name: routine.name,
    days: sharedDays,
  };
}

export function serializeSharedRoutine(shared: SharedRoutine): string {
  return JSON.stringify(shared, null, 2);
}

function isValidSharedExercise(value: unknown): value is SharedRoutineExercise {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as SharedRoutineExercise;
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.muscleGroup === 'string' &&
    typeof candidate.sets === 'number' &&
    typeof candidate.reps === 'string' &&
    typeof candidate.dropset === 'boolean' &&
    typeof candidate.toFailure === 'boolean'
  );
}

function isValidSharedDay(value: unknown): value is SharedRoutineDay {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as SharedRoutineDay;
  return (
    typeof candidate.name === 'string' &&
    Array.isArray(candidate.exercises) &&
    candidate.exercises.every(isValidSharedExercise)
  );
}

function isValidSharedRoutine(value: unknown): value is SharedRoutine {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as SharedRoutine;
  return (
    typeof candidate.version === 'number' &&
    typeof candidate.name === 'string' &&
    Array.isArray(candidate.days) &&
    candidate.days.every(isValidSharedDay)
  );
}

export function parseSharedRoutine(jsonString: string): SharedRoutine | null {
  try {
    const parsed = JSON.parse(jsonString) as unknown;
    if (isValidSharedRoutine(parsed)) {
      return parsed;
    }
  } catch {
    // fall through
  }
  return null;
}

export function importSharedRoutine(
  shared: SharedRoutine,
  existingExercises: Exercise[],
  muscleGroups: string[]
): RoutineImportResult {
  const existingByKey = new Map(existingExercises.map((exercise) => [buildExerciseKey(exercise.name, exercise.muscleGroup), exercise]));
  const createdExercises: Exercise[] = [];

  function resolveExercise(name: string, muscleGroup: string): Exercise {
    const key = buildExerciseKey(name, muscleGroup);
    const existing = existingByKey.get(key);
    if (existing) return existing;

    const created: Exercise = {
      id: makeId('exercise'),
      name: name.trim(),
      muscleGroup: muscleGroup.trim(),
      logs: [],
      updatedAt: new Date().toISOString(),
    };
    createdExercises.push(created);
    existingByKey.set(key, created);
    return created;
  }

  function importExercise(sharedExercise: SharedRoutineExercise): { routineExercise: RoutineExercise; exercise: Exercise } {
    const exercise = resolveExercise(sharedExercise.name, sharedExercise.muscleGroup);
    const alternative = sharedExercise.alternativeName && sharedExercise.alternativeMuscleGroup
      ? resolveExercise(sharedExercise.alternativeName, sharedExercise.alternativeMuscleGroup)
      : undefined;

    const routineExercise: RoutineExercise = {
      exerciseId: exercise.id,
      sets: sharedExercise.sets,
      reps: sharedExercise.reps,
      dropset: sharedExercise.dropset,
      toFailure: sharedExercise.toFailure,
      restSeconds: sharedExercise.restSeconds,
    };

    if (alternative && alternative.id !== exercise.id) {
      routineExercise.alternativeExerciseId = alternative.id;
    }

    return { routineExercise, exercise };
  }

  const importedExercises = new Map<string, Exercise>();
  const days: RoutineDay[] = shared.days.map((sharedDay) => {
    const dayResult = sharedDay.exercises.map(importExercise);
    dayResult.forEach(({ exercise }) => importedExercises.set(exercise.id, exercise));

    return {
      id: makeId('day'),
      name: sharedDay.name,
      exercises: dayResult.map(({ routineExercise }) => routineExercise),
    };
  });

  const newGroups = new Set(muscleGroups);
  createdExercises.forEach((exercise) => newGroups.add(exercise.muscleGroup));

  return {
    routine: {
      id: makeId('routine'),
      name: shared.name,
      days,
      updatedAt: new Date().toISOString(),
    },
    createdExercises,
  };
}
