import { Exercise, ExerciseLog, GroupSortPreference, Routine, RoutineDay, RoutineExercise, StorageManagerInterface } from '../../types';
import { DEFAULT_GROUP_SORT_PREFERENCE } from '../../utils/exerciseSorting';
import { getLanguage, translations } from '../../utils/translations';

export const SCHEMA_VERSION = 3;

function makeStorageId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

const STORAGE_KEY = 'lift_data_v1';
const GROUPS_KEY = 'lift_groups_v1';
const GROUP_SORT_KEY = 'lift_group_sort_v1';
const ROUTINES_KEY = 'lift_routines_v1';
const META_KEY = 'lift_meta_v2';

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
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

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
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

const DEFAULT_GROUPS = [
  'Pecho',
  'Espalda',
  'Cuádriceps',
  'Femoral',
  'Glúteo',
  'Hombro',
  'Bíceps',
  'Tríceps',
  'Abdominales',
  'Cardio',
  'Otro'
];

function buildSeedExercises(): Exercise[] {
  const lang = getLanguage();
  const names = translations[lang].seedExercises;
  const seed: Array<{ key: keyof typeof names; group: string }> = [
    { key: 'benchPress', group: 'Pecho' },
    { key: 'inclinePress', group: 'Pecho' },
    { key: 'chestFly', group: 'Pecho' },
    { key: 'dips', group: 'Pecho' },
    { key: 'latPulldown', group: 'Espalda' },
    { key: 'barbellRow', group: 'Espalda' },
    { key: 'deadlift', group: 'Espalda' },
    { key: 'facePull', group: 'Espalda' },
    { key: 'squat', group: 'Cuádriceps' },
    { key: 'legPress', group: 'Cuádriceps' },
    { key: 'legExtension', group: 'Cuádriceps' },
    { key: 'legCurl', group: 'Femoral' },
    { key: 'romanianDeadlift', group: 'Femoral' },
    { key: 'goodMorning', group: 'Femoral' },
    { key: 'hipThrust', group: 'Glúteo' },
    { key: 'bulgarianSplitSquat', group: 'Glúteo' },
    { key: 'gluteKickback', group: 'Glúteo' },
    { key: 'militaryPress', group: 'Hombro' },
    { key: 'lateralRaise', group: 'Hombro' },
    { key: 'frontRaise', group: 'Hombro' },
    { key: 'barbellCurl', group: 'Bíceps' },
    { key: 'hammerCurl', group: 'Bíceps' },
    { key: 'inclineCurl', group: 'Bíceps' },
    { key: 'skullCrusher', group: 'Tríceps' },
    { key: 'tricepPushdown', group: 'Tríceps' },
    { key: 'tricepKickback', group: 'Tríceps' },
    { key: 'crunch', group: 'Abdominales' },
    { key: 'plank', group: 'Abdominales' },
    { key: 'legRaise', group: 'Abdominales' },
    { key: 'treadmill', group: 'Cardio' },
    { key: 'bike', group: 'Cardio' },
    { key: 'elliptical', group: 'Cardio' },
    { key: 'cableWristCurl', group: 'Otro' },
    { key: 'shrugs', group: 'Otro' },
  ];
  return seed.map(({ key, group }, index) => ({
    id: `seed_${index}_${key}`,
    name: names[key],
    muscleGroup: group,
    logs: [],
  }));
}

function clearAllLiftKeys(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('lift_')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

function validateSchema(): void {
  const meta = safeParse<{ schemaVersion?: number }>(localStorage.getItem(META_KEY), {});
  if (meta.schemaVersion !== SCHEMA_VERSION) {
    clearAllLiftKeys();
    localStorage.setItem(META_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION }));
  }
}

export class LocalStorageAdapter implements StorageManagerInterface {
  constructor() {
    validateSchema();
  }

  private loadData(): Exercise[] {
    const parsed = safeParse<unknown>(localStorage.getItem(STORAGE_KEY), []);
    return Array.isArray(parsed) ? parsed.filter(isExercise) : [];
  }

  private saveData(data: Exercise[]): Promise<void> {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return Promise.resolve();
  }

  async getExercises(): Promise<Exercise[]> {
    const data = this.loadData();
    if (data.length > 0) return data;
    if (localStorage.getItem(STORAGE_KEY)) {
      await this.saveData([]);
    }
    const seed = buildSeedExercises();
    await this.saveData(seed);
    return seed;
  }

  async saveExercise(exercise: Exercise): Promise<void> {
    const exercises = this.loadData();
    const index = exercises.findIndex((e) => e.id === exercise.id);
    if (index >= 0) {
      exercises[index] = exercise;
    } else {
      exercises.push(exercise);
    }
    await this.saveData(exercises);
  }

  async deleteExercise(id: string): Promise<void> {
    let exercises = this.loadData();
    exercises = exercises.filter((e) => e.id !== id);
    await this.saveData(exercises);

    const routines = await this.getRoutines();
    let routinesChanged = false;
    const cleanedRoutines = routines.map((routine) => {
      const cleanedDays = routine.days.map((day) => {
        const cleanedExercises = day.exercises
          .filter((re) => re.exerciseId !== id)
          .map((re) => {
            if (re.alternativeExerciseId === id) {
              routinesChanged = true;
              return { ...re, alternativeExerciseId: undefined };
            }
            return re;
          });
        if (cleanedExercises.length !== day.exercises.length) {
          routinesChanged = true;
        }
        return { ...day, exercises: cleanedExercises };
      });
      if (cleanedDays.some((day, index) => day.exercises.length !== routine.days[index].exercises.length)) {
        routinesChanged = true;
      }
      return { ...routine, days: cleanedDays };
    });

    if (routinesChanged) {
      localStorage.setItem(ROUTINES_KEY, JSON.stringify(cleanedRoutines));
    }
  }

  async updateExerciseDetails(id: string, newName: string, newGroup: string): Promise<void> {
    const exercises = this.loadData();
    const exercise = exercises.find((e) => e.id === id);
    if (exercise) {
      exercise.name = newName;
      exercise.muscleGroup = newGroup;
      await this.saveData(exercises);
    }
  }

  async logSession(exerciseId: string, weight: number | null, reps: number | null): Promise<void> {
    const exercises = this.loadData();
    const exercise = exercises.find((e) => e.id === exerciseId);
    if (exercise) {
      const today = new Date().toISOString().split('T')[0];
      const existingLogIndex = exercise.logs.findIndex((l) => l.date === today);
      const newLog: ExerciseLog = { date: today, weight, reps };
      if (existingLogIndex >= 0) {
        exercise.logs[existingLogIndex] = newLog;
      } else {
        exercise.logs.push(newLog);
      }
      await this.saveExercise(exercise);
    }
  }

  async updateExerciseNote(id: string, note: string): Promise<void> {
    const exercises = this.loadData();
    const exercise = exercises.find((e) => e.id === id);
    if (exercise) {
      const trimmedNote = note.trim();
      exercise.note = trimmedNote.length > 0 ? trimmedNote : undefined;
      await this.saveData(exercises);
    }
  }

  async updateExerciseLog(exerciseId: string, originalDate: string, log: ExerciseLog): Promise<void> {
    const exercises = this.loadData();
    const exercise = exercises.find((e) => e.id === exerciseId);
    if (!exercise) return;

    const originalIndex = exercise.logs.findIndex((item) => item.date === originalDate);
    if (originalIndex === -1) return;

    const updatedLog: ExerciseLog = {
      date: log.date,
      weight: log.weight,
      reps: log.reps,
    };

    const existingIndex = exercise.logs.findIndex((item) => item.date === updatedLog.date);
    if (existingIndex !== -1 && existingIndex !== originalIndex) {
      exercise.logs[existingIndex] = updatedLog;
      exercise.logs.splice(originalIndex, 1);
    } else {
      exercise.logs[originalIndex] = updatedLog;
    }

    await this.saveData(exercises);
  }

  async deleteExerciseLog(exerciseId: string, date: string): Promise<void> {
    const exercises = this.loadData();
    const exercise = exercises.find((e) => e.id === exerciseId);
    if (exercise) {
      exercise.logs = exercise.logs.filter((log) => log.date !== date);
      await this.saveData(exercises);
    }
  }

  async deleteAllLogs(exerciseId: string): Promise<void> {
    const exercises = this.loadData();
    const exercise = exercises.find((e) => e.id === exerciseId);
    if (exercise) {
      exercise.logs = [];
      await this.saveData(exercises);
    }
  }

  async deleteAllLogsExceptLatest(exerciseId: string): Promise<void> {
    const exercises = this.loadData();
    const exercise = exercises.find((e) => e.id === exerciseId);
    if (exercise && exercise.logs.length > 1) {
      const sorted = [...exercise.logs].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      exercise.logs = [sorted[0]];
      await this.saveData(exercises);
    }
  }

  async getMuscleGroups(): Promise<string[]> {
    const parsed = safeParse<unknown>(localStorage.getItem(GROUPS_KEY), null);
    if (isStringArray(parsed)) {
      return parsed;
    }
    await this.saveMuscleGroups(DEFAULT_GROUPS);
    return DEFAULT_GROUPS;
  }

  private async saveMuscleGroups(groups: string[]): Promise<void> {
    localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
  }

  async addMuscleGroup(group: string): Promise<void> {
    const groups = await this.getMuscleGroups();
    if (!groups.includes(group)) {
      groups.push(group);
      await this.saveMuscleGroups(groups);
    }
  }

  async deleteMuscleGroup(group: string): Promise<void> {
    let groups = await this.getMuscleGroups();
    groups = groups.filter(g => g !== group);
    await this.saveMuscleGroups(groups);

    const exercises = this.loadData();
    const removedExerciseIds = exercises
      .filter((exercise) => exercise.muscleGroup === group)
      .map((exercise) => exercise.id);
    if (removedExerciseIds.length === 0) return;

    await this.saveData(exercises.filter((exercise) => exercise.muscleGroup !== group));

    const removedIds = new Set(removedExerciseIds);
    const routines = await this.getRoutines();
    let routinesChanged = false;
    const cleanedRoutines = routines.map((routine) => {
      const cleanedDays = routine.days.map((day) => {
        const cleanedExercises = day.exercises
          .filter((routineExercise) => !removedIds.has(routineExercise.exerciseId))
          .map((routineExercise) => {
            if (routineExercise.alternativeExerciseId && removedIds.has(routineExercise.alternativeExerciseId)) {
              routinesChanged = true;
              return { ...routineExercise, alternativeExerciseId: undefined };
            }
            return routineExercise;
          });
        if (cleanedExercises.length !== day.exercises.length) {
          routinesChanged = true;
        }
        return { ...day, exercises: cleanedExercises };
      });
      if (cleanedDays.some((day, index) => day.exercises.length !== routine.days[index].exercises.length)) {
        routinesChanged = true;
      }
      return { ...routine, days: cleanedDays };
    });

    if (routinesChanged) {
      localStorage.setItem(ROUTINES_KEY, JSON.stringify(cleanedRoutines));
    }
  }

  async renameMuscleGroup(oldName: string, newName: string): Promise<void> {
    const groups = await this.getMuscleGroups();
    const index = groups.indexOf(oldName);
    if (index !== -1) {
      groups[index] = newName;
      await this.saveMuscleGroups(groups);

      const exercises = this.loadData();
      let changed = false;
      exercises.forEach(ex => {
        if (ex.muscleGroup === oldName) {
          ex.muscleGroup = newName;
          changed = true;
        }
      });
      if (changed) await this.saveData(exercises);
    }
  }

  async getGroupSortPreference(): Promise<GroupSortPreference> {
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

  async saveGroupSortPreference(preference: GroupSortPreference): Promise<void> {
    localStorage.setItem(GROUP_SORT_KEY, JSON.stringify(preference));
  }

  async getRoutines(): Promise<Routine[]> {
    const parsed = safeParse<unknown>(localStorage.getItem(ROUTINES_KEY), []);
    if (!Array.isArray(parsed)) return [];
    const exerciseIds = new Set(this.loadData().map((ex) => ex.id));

    const cleanRoutineExercise = (re: RoutineExercise): RoutineExercise | null => {
      if (!exerciseIds.has(re.exerciseId)) return null;
      return {
        ...re,
        alternativeExerciseId: re.alternativeExerciseId && exerciseIds.has(re.alternativeExerciseId) ? re.alternativeExerciseId : undefined,
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
        return [{ id: raw.id, name: raw.name, days: migratedDays }];
      }

      if (Array.isArray(raw.exercises) && raw.exercises.every(isRoutineExerciseLike)) {
        const migrated = migrateLegacyExercises(raw.exercises);
        return [{ id: raw.id, name: raw.name, days: [{ id: makeStorageId('day'), name: 'Día 1', exercises: migrated }] }];
      }

      const legacyExerciseIds = Array.isArray(raw.exerciseIds) ? raw.exerciseIds.filter((id): id is string => typeof id === 'string') : [];
      const migrated: RoutineExercise[] = legacyExerciseIds
        .filter((id) => exerciseIds.has(id))
        .map((id) => ({
          exerciseId: id,
          sets: 3,
          reps: '10',
          dropset: false,
          toFailure: false,
        }));
      return [{ id: raw.id, name: raw.name, days: [{ id: makeStorageId('day'), name: 'Día 1', exercises: migrated }] }];
    });
  }

  async saveRoutine(routine: Routine): Promise<void> {
    const routines = await this.getRoutines();
    const index = routines.findIndex((r) => r.id === routine.id);
    if (index >= 0) {
      routines[index] = routine;
    } else {
      routines.push(routine);
    }
    localStorage.setItem(ROUTINES_KEY, JSON.stringify(routines));
  }

  async deleteRoutine(id: string): Promise<void> {
    const routines = await this.getRoutines().then((r) => r.filter((r) => r.id !== id));
    localStorage.setItem(ROUTINES_KEY, JSON.stringify(routines));
  }

  async reorderRoutine(fromIndex: number, toIndex: number): Promise<void> {
    const routines = await this.getRoutines();
    if (fromIndex < 0 || fromIndex >= routines.length || toIndex < 0 || toIndex >= routines.length) return;
    const [moved] = routines.splice(fromIndex, 1);
    routines.splice(toIndex, 0, moved);
    localStorage.setItem(ROUTINES_KEY, JSON.stringify(routines));
  }

  async reorderRoutineExercise(routineId: string, dayId: string, fromIndex: number, toIndex: number): Promise<void> {
    const routines = await this.getRoutines();
    const routine = routines.find((r) => r.id === routineId);
    if (!routine) return;
    const day = routine.days.find((d) => d.id === dayId);
    if (!day) return;
    const exercises = [...day.exercises];
    const [moved] = exercises.splice(fromIndex, 1);
    exercises.splice(toIndex, 0, moved);
    day.exercises = exercises;
    localStorage.setItem(ROUTINES_KEY, JSON.stringify(routines));
  }

  async exportData(): Promise<string> {
    const backup = {
      exercises: this.loadData(),
      groups: await this.getMuscleGroups(),
      routines: await this.getRoutines(),
    };
    return JSON.stringify(backup, null, 2);
  }

  async importData(jsonString: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(jsonString) as unknown;
      let exercisesToImport: Exercise[] = [];
      let groupsToImport: string[] = [];
      let routinesToImport: Routine[] = [];

      if (Array.isArray(parsed)) {
        exercisesToImport = parsed.filter(isExercise);
      } else if (typeof parsed === 'object' && parsed !== null && 'exercises' in parsed && Array.isArray((parsed as { exercises: unknown }).exercises)) {
        const data = parsed as { exercises: unknown[]; groups?: unknown; routines?: unknown };
        exercisesToImport = data.exercises.filter(isExercise);
        if (Array.isArray(data.groups)) {
          groupsToImport = data.groups.filter((item): item is string => typeof item === 'string');
        }
        if (Array.isArray(data.routines)) {
          routinesToImport = data.routines.flatMap((routine) => {
            const raw = routine as { id?: unknown; name?: unknown; days?: unknown; exercises?: unknown };
            if (typeof raw.id !== 'string' || typeof raw.name !== 'string') return [];

            const normalizeExercise = (re: unknown): RoutineExercise | null => {
              if (!isRoutineExerciseLike(re)) return null;
              return {
                ...re,
                reps: typeof re.reps === 'number' ? String(re.reps) : re.reps,
                toFailure: re.toFailure ?? false,
              };
            };

            if (Array.isArray(raw.days) && raw.days.every(isRoutineDay)) {
              return [{
                id: raw.id,
                name: raw.name,
                days: raw.days.map((day) => ({
                  ...day,
                  exercises: day.exercises.map(normalizeExercise).filter((re): re is RoutineExercise => re !== null),
                })),
              }];
            }

            const legacyExercises = Array.isArray(raw.exercises) ? raw.exercises.map(normalizeExercise).filter((re): re is RoutineExercise => re !== null) : [];
            return [{
              id: raw.id,
              name: raw.name,
              days: [{ id: makeStorageId('day'), name: 'Día 1', exercises: legacyExercises }],
            }];
          });
        }
      } else {
        return false;
      }

      const currentData = this.loadData();
      const newMap = new Map(currentData.map((item) => [item.id, item]));
      exercisesToImport.forEach((item: Exercise) => {
        newMap.set(item.id, item);
      });
      await this.saveData(Array.from(newMap.values()));

      if (groupsToImport.length > 0) {
        const currentGroups = await this.getMuscleGroups();
        const combinedGroups = Array.from(new Set([...currentGroups, ...groupsToImport]));
        await this.saveMuscleGroups(combinedGroups);
      }

      if (routinesToImport.length > 0) {
        const currentRoutines = await this.getRoutines();
        const routineMap = new Map(currentRoutines.map((r) => [r.id, r]));
        routinesToImport.forEach((r: Routine) => {
          routineMap.set(r.id, r);
        });
        localStorage.setItem(ROUTINES_KEY, JSON.stringify(Array.from(routineMap.values())));
      }

      return true;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  }
}
