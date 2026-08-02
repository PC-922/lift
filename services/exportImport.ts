import { Exercise, GroupSortPreference, Routine, RoutineDay, RoutineExercise } from '../types';

export interface BackupData {
  exercises: Exercise[];
  muscleGroups: string[];
  routines: Routine[];
  sortPreference: GroupSortPreference;
}

function isExerciseLog(value: unknown): value is { date: string; weight: number | null; reps: number | null } {
  return typeof value === 'object' && value !== null
    && typeof (value as { date: unknown }).date === 'string'
    && (typeof (value as { weight: unknown }).weight === 'number' || (value as { weight: unknown }).weight === null)
    && (typeof (value as { reps: unknown }).reps === 'number' || (value as { reps: unknown }).reps === null);
}

function isExercise(value: unknown): value is Exercise {
  return typeof value === 'object' && value !== null
    && typeof (value as Exercise).id === 'string'
    && typeof (value as Exercise).name === 'string'
    && typeof (value as Exercise).muscleGroup === 'string'
    && Array.isArray((value as Exercise).logs)
    && (value as Exercise).logs.every(isExerciseLog);
}

function isRoutineExerciseLike(value: unknown): value is RoutineExercise | (Omit<RoutineExercise, 'reps' | 'toFailure'> & { reps: string | number; toFailure?: boolean }) {
  return typeof value === 'object' && value !== null
    && typeof (value as RoutineExercise).exerciseId === 'string'
    && typeof (value as RoutineExercise).sets === 'number'
    && (typeof (value as RoutineExercise).reps === 'string' || typeof (value as RoutineExercise).reps === 'number')
    && typeof (value as RoutineExercise).dropset === 'boolean';
}

function isRoutineDay(value: unknown): value is RoutineDay {
  return typeof value === 'object' && value !== null
    && typeof (value as RoutineDay).id === 'string'
    && typeof (value as RoutineDay).name === 'string'
    && Array.isArray((value as RoutineDay).exercises)
    && (value as RoutineDay).exercises.every(isRoutineExerciseLike);
}

function isRoutine(value: unknown): value is Routine {
  return typeof value === 'object' && value !== null
    && typeof (value as Routine).id === 'string'
    && typeof (value as Routine).name === 'string'
    && Array.isArray((value as Routine).days)
    && (value as Routine).days.every(isRoutineDay);
}

export function exportData(data: BackupData): string {
  return JSON.stringify(
    {
      exercises: data.exercises,
      groups: data.muscleGroups,
      routines: data.routines,
      sortPreference: data.sortPreference,
    },
    null,
    2
  );
}

export function importData(jsonString: string): BackupData | null {
  try {
    const parsed = JSON.parse(jsonString) as unknown;

    if (Array.isArray(parsed)) {
      return {
        exercises: parsed.filter(isExercise),
        muscleGroups: [],
        routines: [],
        sortPreference: { field: 'progress' as const, direction: 'desc' as const },
      };
    }

    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    const data = parsed as {
      exercises?: unknown;
      groups?: unknown;
      routines?: unknown;
      sortPreference?: unknown;
    };

    const exercises = Array.isArray(data.exercises) ? data.exercises.filter(isExercise) : [];
    const groups = Array.isArray(data.groups) ? data.groups.filter((item): item is string => typeof item === 'string') : [];
    const routines = Array.isArray(data.routines)
      ? data.routines.filter(isRoutine).map((routine) => {
          const normalizedDays = routine.days.map((day) => ({
            ...day,
            exercises: day.exercises
              .filter(isRoutineExerciseLike)
              .map((re) => ({
                ...re,
                reps: typeof re.reps === 'number' ? String(re.reps) : re.reps,
                toFailure: re.toFailure ?? false,
              })),
          }));
          return { ...routine, days: normalizedDays };
        })
      : [];

    const sortPreference =
      data.sortPreference &&
      typeof data.sortPreference === 'object' &&
      ((data.sortPreference as GroupSortPreference).field === 'weight' ||
        (data.sortPreference as GroupSortPreference).field === 'progress')
        ? (data.sortPreference as GroupSortPreference)
        : { field: 'progress' as const, direction: 'desc' as const };

    return { exercises, muscleGroups: groups, routines, sortPreference };
  } catch (error) {
    console.error('Import failed', error);
    return null;
  }
}
