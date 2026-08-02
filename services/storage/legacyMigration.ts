import { DataStore } from './dataStore';
import { Exercise, ExerciseLog, GroupSortPreference, Routine, RoutineDay, RoutineExercise } from '../../types';
import { DEFAULT_GROUP_SORT_PREFERENCE } from '../../utils/exerciseSorting';
import { getDefaultExercises, getDefaultMuscleGroups } from './seedData';

const MIGRATION_FLAG_KEY = 'lift_migrated_v2';

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isExerciseLog(value: unknown): value is ExerciseLog {
  return typeof value === 'object' && value !== null
    && typeof (value as ExerciseLog).date === 'string'
    && (typeof (value as ExerciseLog).weight === 'number' || (value as ExerciseLog).weight === null)
    && (typeof (value as ExerciseLog).reps === 'number' || (value as ExerciseLog).reps === null);
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

function makeStorageId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function migrateV3ToV4(): void {
  const STORAGE_KEY = 'lift_data_v1';
  const ROUTINES_KEY = 'lift_routines_v1';
  const TOMBSTONES_KEY = 'lift_tombstones_v1';
  const META_KEY = 'lift_meta_v2';

  const deriveExerciseUpdatedAt = (exercise: Exercise): string => {
    const latestLog = [...exercise.logs].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
    return latestLog?.date ?? new Date().toISOString();
  };

  const exercises = safeParse<unknown[]>(localStorage.getItem(STORAGE_KEY), []);
  const migratedExercises = Array.isArray(exercises)
    ? exercises.filter(isExercise).map((item) => ({
        ...item,
        updatedAt: deriveExerciseUpdatedAt(item),
      }))
    : [];

  const routines = safeParse<unknown[]>(localStorage.getItem(ROUTINES_KEY), []);
  const migratedRoutines = Array.isArray(routines)
    ? routines.filter(isRoutine).map((item) => ({
        ...item,
        updatedAt: new Date().toISOString(),
      }))
    : [];

  localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedExercises));
  localStorage.setItem(ROUTINES_KEY, JSON.stringify(migratedRoutines));
  localStorage.setItem(TOMBSTONES_KEY, JSON.stringify({ exercises: {}, routines: {} }));
  localStorage.setItem(META_KEY, JSON.stringify({ schemaVersion: 4 }));
}

function readLegacyExercises(): Exercise[] {
  const STORAGE_KEY = 'lift_data_v1';
  const parsed = safeParse<unknown>(localStorage.getItem(STORAGE_KEY), []);
  return Array.isArray(parsed) ? parsed.filter(isExercise) : [];
}

function readLegacyRoutines(exercises: Exercise[]): Routine[] {
  const ROUTINES_KEY = 'lift_routines_v1';
  const parsed = safeParse<unknown>(localStorage.getItem(ROUTINES_KEY), []);
  if (!Array.isArray(parsed)) return [];

  const exerciseIds = new Set(exercises.map((ex) => ex.id));

  const cleanRoutineExercise = (re: RoutineExercise): RoutineExercise | null => {
    if (!exerciseIds.has(re.exerciseId)) return null;
    return {
      ...re,
      alternativeExerciseId: re.alternativeExerciseId && exerciseIds.has(re.alternativeExerciseId)
        ? re.alternativeExerciseId
        : undefined,
    };
  };

  const migrateLegacyExercises = (legacyExercises: unknown[]): RoutineExercise[] => {
    return legacyExercises
      .filter(isRoutineExerciseLike)
      .map((re) => ({
        ...re,
        reps: typeof re.reps === 'number' ? String(re.reps) : re.reps,
        toFailure: re.toFailure ?? false,
      }))
      .map(cleanRoutineExercise)
      .filter((re): re is RoutineExercise => re !== null);
  };

  return parsed.flatMap((item) => {
    const raw = item as { id?: unknown; name?: unknown; days?: unknown; exercises?: unknown; exerciseIds?: unknown };
    if (typeof raw.id !== 'string' || typeof raw.name !== 'string') return [];

    if (Array.isArray(raw.days) && raw.days.every(isRoutineDay)) {
      const migratedDays = raw.days.map((day) => ({
        ...day,
        exercises: migrateLegacyExercises(day.exercises),
      }));
      return [{ id: raw.id, name: raw.name, days: migratedDays, updatedAt: (item as Routine).updatedAt }];
    }

    if (Array.isArray(raw.exercises) && raw.exercises.every(isRoutineExerciseLike)) {
      const migrated = migrateLegacyExercises(raw.exercises);
      return [{ id: raw.id, name: raw.name, days: [{ id: makeStorageId('day'), name: 'Día 1', exercises: migrated }], updatedAt: (item as Routine).updatedAt }];
    }

    const legacyExerciseIds = Array.isArray(raw.exerciseIds)
      ? raw.exerciseIds.filter((id): id is string => typeof id === 'string')
      : [];
    const migrated: RoutineExercise[] = legacyExerciseIds
      .filter((id) => exerciseIds.has(id))
      .map((id) => ({
        exerciseId: id,
        sets: 3,
        reps: '10',
        dropset: false,
        toFailure: false,
      }));
    return [{ id: raw.id, name: raw.name, days: [{ id: makeStorageId('day'), name: 'Día 1', exercises: migrated }], updatedAt: (item as Routine).updatedAt }];
  });
}

function readLegacyGroups(): string[] {
  const GROUPS_KEY = 'lift_groups_v1';
  const parsed = safeParse<unknown>(localStorage.getItem(GROUPS_KEY), null);
  return isStringArray(parsed) ? parsed : getDefaultMuscleGroups();
}

function readLegacySortPreference(): GroupSortPreference {
  const GROUP_SORT_KEY = 'lift_group_sort_v1';
  const data = localStorage.getItem(GROUP_SORT_KEY);
  if (!data) return DEFAULT_GROUP_SORT_PREFERENCE;
  try {
    const parsed = JSON.parse(data) as GroupSortPreference;
    const isValidField = parsed.field === 'progress' || parsed.field === 'weight';
    const isValidDirection = parsed.direction === 'asc' || parsed.direction === 'desc';
    if (isValidField && isValidDirection) {
      return parsed;
    }
  } catch {
    // fall through
  }
  return DEFAULT_GROUP_SORT_PREFERENCE;
}

function ensureV4Schema(): void {
  const META_KEY = 'lift_meta_v2';
  const meta = safeParse<{ schemaVersion?: number }>(localStorage.getItem(META_KEY), {});
  if (meta.schemaVersion === 3) {
    migrateV3ToV4();
  }
}

export async function migrateLegacyDataIfNeeded(dataStore: DataStore): Promise<void> {
  if (typeof localStorage === 'undefined' || !localStorage.getItem) return;
  if (localStorage.getItem(MIGRATION_FLAG_KEY)) return;

  try {
    const hasData = await dataStore.hasData();
    if (hasData) {
      localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
      return;
    }

    ensureV4Schema();

    const exercises = readLegacyExercises();
    const routines = readLegacyRoutines(exercises);
    const groups = readLegacyGroups();
    const sortPreference = readLegacySortPreference();

    const hasLegacyState =
      exercises.length > 0 ||
      routines.length > 0 ||
      localStorage.getItem('lift_groups_v1') !== null ||
      localStorage.getItem('lift_group_sort_v1') !== null;

    if (!hasLegacyState) {
      const seedGroups = getDefaultMuscleGroups();
      const seedExercises = getDefaultExercises().map((exercise, index) => ({ ...exercise, order: index }));
      await dataStore.saveMuscleGroups(seedGroups);
      await dataStore.saveGroupSortPreference(DEFAULT_GROUP_SORT_PREFERENCE);
      for (const exercise of seedExercises) {
        await dataStore.saveExercise(exercise);
      }
      localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
      return;
    }

    const stampedExercises = exercises.map((exercise, index) => ({
      ...exercise,
      order: index,
      updatedAt: exercise.updatedAt ?? new Date().toISOString(),
    }));
    const stampedRoutines = routines.map((routine, index) => ({
      ...routine,
      order: index,
      updatedAt: routine.updatedAt ?? new Date().toISOString(),
    }));

    await dataStore.saveMuscleGroups(groups);
    await dataStore.saveGroupSortPreference(sortPreference);
    for (const exercise of stampedExercises) {
      await dataStore.saveExercise(exercise);
    }
    for (const routine of stampedRoutines) {
      await dataStore.saveRoutine(routine);
    }

    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
  } catch (error) {
    console.error('Legacy migration failed', error);
  }
}
