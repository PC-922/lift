import type {
  Exercise,
  ExerciseLog,
  Routine,
  RoutineDay,
  RoutineExercise,
  Workout,
  WorkoutEntry,
  WorkoutSet,
} from '../domain';
import { normalizeRoutineBlocks, normalizeWorkoutBlocks } from '../domain/BlockId';

export interface BackupData {
  exercises: Exercise[];
  muscleGroups: string[];
  routines: Routine[];
  workouts: Workout[];
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
    && (exercise.blockId === undefined || typeof exercise.blockId === 'string')
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

function isWorkoutSet(value: unknown): value is WorkoutSet {
  if (typeof value !== 'object' || value === null) return false;
  const set = value as WorkoutSet;
  return (typeof set.weight === 'number' || set.weight === null)
    && (typeof set.reps === 'number' || set.reps === null);
}

function isWorkoutEntry(value: unknown): value is WorkoutEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as WorkoutEntry;
  return typeof entry.exerciseId === 'string'
    && (entry.blockId === undefined || typeof entry.blockId === 'string')
    && (entry.exerciseName === undefined || typeof entry.exerciseName === 'string')
    && Array.isArray(entry.sets)
    && entry.sets.every(isWorkoutSet);
}

function isWorkout(value: unknown): value is Workout {
  if (typeof value !== 'object' || value === null) return false;
  const workout = value as Workout;
  return typeof workout.id === 'string'
    && typeof workout.name === 'string'
    && typeof workout.startedAt === 'string'
    && typeof workout.finishedAt === 'string'
    && (workout.routineId === undefined || typeof workout.routineId === 'string')
    && (workout.dayId === undefined || typeof workout.dayId === 'string')
    && Array.isArray(workout.entries)
    && workout.entries.every(isWorkoutEntry);
}

export function serializeBackup(data: BackupData): string {
  return JSON.stringify({
    exercises: data.exercises,
    groups: data.muscleGroups,
    routines: data.routines,
    workouts: data.workouts,
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
      workouts?: unknown;
    };
    if (!Array.isArray(backup.exercises) || !backup.exercises.every(isExercise)) return null;
    if (!Array.isArray(backup.groups) || !backup.groups.every((group): group is string => typeof group === 'string')) return null;
    if (!Array.isArray(backup.routines) || !backup.routines.every(isRoutine)) return null;
    if (backup.workouts !== undefined && (!Array.isArray(backup.workouts) || !backup.workouts.every(isWorkout))) return null;
    const exerciseIds = new Set(backup.exercises.map((exercise) => exercise.id));
    return {
      exercises: backup.exercises,
      muscleGroups: backup.groups,
      routines: backup.routines.map((routine) => normalizeRoutineBlocks({
        ...routine,
        days: routine.days.map((day) => ({
          ...day,
          exercises: day.exercises.filter((exercise) => exerciseIds.has(exercise.exerciseId)),
        })),
      })),
      workouts: (backup.workouts ?? []).map(normalizeWorkoutBlocks),
    };
  } catch {
    return null;
  }
}
