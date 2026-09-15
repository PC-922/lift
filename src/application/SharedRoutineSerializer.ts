import type { Exercise, Routine } from '../domain';

export interface SharedRoutineExercise {
  name: string;
  muscleGroup: string;
  sets: number;
  reps: string;
  dropset: boolean;
  toFailure: boolean;
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

export function createSharedRoutine(routine: Routine, exercises: Exercise[]): SharedRoutine {
  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  return {
    version: 1,
    name: routine.name,
    days: routine.days.map((day) => ({
      name: day.name,
      exercises: day.exercises.flatMap((item) => {
        const exercise = exerciseById.get(item.exerciseId);
        if (!exercise) return [];
        return [{
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
          sets: item.sets,
          reps: item.reps,
          dropset: item.dropset,
          toFailure: item.toFailure,
          restSeconds: item.restSeconds,
        }];
      }),
    })),
  };
}

export function serializeSharedRoutine(shared: SharedRoutine): string {
  return JSON.stringify(shared, null, 2);
}

function isSharedExercise(value: unknown): value is SharedRoutineExercise {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as SharedRoutineExercise;
  return typeof item.name === 'string'
    && typeof item.muscleGroup === 'string'
    && typeof item.sets === 'number'
    && typeof item.reps === 'string'
    && typeof item.dropset === 'boolean'
    && typeof item.toFailure === 'boolean';
}

function isSharedRoutine(value: unknown): value is SharedRoutine {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as SharedRoutine;
  return typeof item.version === 'number'
    && typeof item.name === 'string'
    && Array.isArray(item.days)
    && item.days.every((day) => (
      typeof day === 'object'
      && day !== null
      && typeof day.name === 'string'
      && Array.isArray(day.exercises)
      && day.exercises.every(isSharedExercise)
    ));
}

export function parseSharedRoutine(json: string): SharedRoutine | null {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!isSharedRoutine(parsed)) return null;
    return {
      version: parsed.version,
      name: parsed.name,
      days: parsed.days.map((day) => ({
        name: day.name,
        exercises: day.exercises.map((exercise) => ({
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
          sets: exercise.sets,
          reps: exercise.reps,
          dropset: exercise.dropset,
          toFailure: exercise.toFailure,
          restSeconds: exercise.restSeconds,
        })),
      })),
    };
  } catch {
    return null;
  }
}
