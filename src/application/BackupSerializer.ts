import type { Exercise, ExerciseLog, Routine, RoutineDay, RoutineExercise } from '../domain';

export interface BackupData {
  exercises: Exercise[];
  muscleGroups: string[];
  routines: Routine[];
}

function isExerciseLog(value: unknown): value is ExerciseLog {
  if (typeof value !== 'object' || value === null) return false;
  const log = value as ExerciseLog;
  return typeof log.date === 'string'
    && (typeof log.weight === 'number' || log.weight === null)
    && (typeof log.reps === 'number' || log.reps === null);
}

function isExercise(value: unknown): value is Exercise {
  if (typeof value !== 'object' || value === null) return false;
  const exercise = value as Exercise;
  return typeof exercise.id === 'string'
    && typeof exercise.name === 'string'
    && typeof exercise.muscleGroup === 'string'
    && Array.isArray(exercise.logs)
    && exercise.logs.every(isExerciseLog);
}

function isRoutineExercise(value: unknown): value is RoutineExercise {
  if (typeof value !== 'object' || value === null) return false;
  const exercise = value as RoutineExercise;
  return typeof exercise.exerciseId === 'string'
    && typeof exercise.sets === 'number'
    && typeof exercise.reps === 'string'
    && typeof exercise.dropset === 'boolean'
    && typeof exercise.toFailure === 'boolean'
    && (exercise.restSeconds === undefined || typeof exercise.restSeconds === 'number');
}

function isRoutineDay(value: unknown): value is RoutineDay {
  if (typeof value !== 'object' || value === null) return false;
  const day = value as RoutineDay;
  return typeof day.id === 'string' && typeof day.name === 'string'
    && Array.isArray(day.exercises) && day.exercises.every(isRoutineExercise);
}

function isRoutine(value: unknown): value is Routine {
  if (typeof value !== 'object' || value === null) return false;
  const routine = value as Routine;
  return typeof routine.id === 'string' && typeof routine.name === 'string'
    && Array.isArray(routine.days) && routine.days.every(isRoutineDay);
}

export function serializeBackup(data: BackupData): string {
  return JSON.stringify({
    exercises: data.exercises,
    groups: data.muscleGroups,
    routines: data.routines,
  }, null, 2);
}

export function parseBackup(json: string): BackupData | null {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return null;
    const backup = parsed as {
      exercises?: unknown;
      groups?: unknown;
      routines?: unknown;
    };
    if (!Array.isArray(backup.exercises) || !backup.exercises.every(isExercise)) return null;
    if (!Array.isArray(backup.groups) || !backup.groups.every((group): group is string => typeof group === 'string')) return null;
    if (!Array.isArray(backup.routines) || !backup.routines.every(isRoutine)) return null;
    return {
      exercises: backup.exercises,
      muscleGroups: backup.groups,
      routines: backup.routines,
    };
  } catch {
    return null;
  }
}
