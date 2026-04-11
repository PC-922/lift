import { Exercise, ExerciseLog, GroupSortPreference, Routine, RoutineExercise, StorageManagerInterface } from '../types';
import { DEFAULT_GROUP_SORT_PREFERENCE } from '../utils/exerciseSorting';
import { getLanguage, translations } from '../utils/translations';

const STORAGE_KEY = 'lift_data_v1';
const GROUPS_KEY = 'lift_groups_v1';
const GROUP_SORT_KEY = 'lift_group_sort_v1';
const ROUTINES_KEY = 'lift_routines_v1';

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
    && typeof (value as ExerciseLog).weight === 'number'
    && typeof (value as ExerciseLog).reps === 'number';
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

function isRoutine(value: unknown): value is Routine {
  return typeof value === 'object' && value !== null
    && typeof (value as Routine).id === 'string'
    && typeof (value as Routine).name === 'string'
    && Array.isArray((value as Routine).exercises)
    && (value as Routine).exercises.every(isRoutineExercise);
}

function makeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
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

class LocalStorageManager implements StorageManagerInterface {
  private loadData(): Exercise[] {
    const parsed = safeParse<unknown>(localStorage.getItem(STORAGE_KEY), []);
    return Array.isArray(parsed) ? parsed.filter(isExercise) : [];
  }

  private saveData(data: Exercise[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  getExercises(): Exercise[] {
    const data = this.loadData();
    if (data.length > 0) return data;
    if (localStorage.getItem(STORAGE_KEY)) {
      this.saveData([]);
    }
    const seed = buildSeedExercises();
    this.saveData(seed);
    return seed;
  }

  saveExercise(exercise: Exercise): void {
    const exercises = this.loadData();
    const index = exercises.findIndex((e) => e.id === exercise.id);
    if (index >= 0) {
      exercises[index] = exercise;
    } else {
      exercises.push(exercise);
    }
    this.saveData(exercises);
  }

  deleteExercise(id: string): void {
    let exercises = this.loadData();
    exercises = exercises.filter((e) => e.id !== id);
    this.saveData(exercises);
  }

  updateExerciseDetails(id: string, newName: string, newGroup: string): void {
    const exercises = this.loadData();
    const exercise = exercises.find((e) => e.id === id);
    if (exercise) {
      exercise.name = newName;
      exercise.muscleGroup = newGroup;
      this.saveData(exercises);
    }
  }

  renameExercise(id: string, newName: string): void {
    this.updateExerciseDetails(id, newName, this.getExercises().find(e => e.id === id)?.muscleGroup || 'Otro');
  }

  logSession(exerciseId: string, weight: number, reps: number): void {
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
      
      this.saveExercise(exercise);
    }
  }

  updateExerciseNote(id: string, note: string): void {
    const exercises = this.loadData();
    const exercise = exercises.find((e) => e.id === id);
    if (exercise) {
      const trimmedNote = note.trim();
      exercise.note = trimmedNote.length > 0 ? trimmedNote : undefined;
      this.saveData(exercises);
    }
  }

  updateExerciseLog(exerciseId: string, originalDate: string, log: ExerciseLog): void {
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

    this.saveData(exercises);
  }

  deleteExerciseLog(exerciseId: string, date: string): void {
    const exercises = this.loadData();
    const exercise = exercises.find((e) => e.id === exerciseId);
    if (exercise) {
      exercise.logs = exercise.logs.filter((log) => log.date !== date);
      this.saveData(exercises);
    }
  }

  deleteAllLogs(exerciseId: string): void {
    const exercises = this.loadData();
    const exercise = exercises.find((e) => e.id === exerciseId);
    if (exercise) {
      exercise.logs = [];
      this.saveData(exercises);
    }
  }

  deleteAllLogsExceptLatest(exerciseId: string): void {
    const exercises = this.loadData();
    const exercise = exercises.find((e) => e.id === exerciseId);
    if (exercise && exercise.logs.length > 1) {
      const sorted = [...exercise.logs].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      exercise.logs = [sorted[0]];
      this.saveData(exercises);
    }
  }

  getMuscleGroups(): string[] {
    const parsed = safeParse<unknown>(localStorage.getItem(GROUPS_KEY), null);
    if (isStringArray(parsed)) {
      return parsed;
    } else {
      this.saveMuscleGroups(DEFAULT_GROUPS);
      return DEFAULT_GROUPS;
    }
  }

  private saveMuscleGroups(groups: string[]): void {
    localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
  }

  addMuscleGroup(group: string): void {
    const groups = this.getMuscleGroups();
    if (!groups.includes(group)) {
      groups.push(group);
      this.saveMuscleGroups(groups);
    }
  }

  deleteMuscleGroup(group: string): void {
    let groups = this.getMuscleGroups();
    groups = groups.filter(g => g !== group);
    this.saveMuscleGroups(groups);

    const exercises = this.loadData();
    let changed = false;
    exercises.forEach(ex => {
      if (ex.muscleGroup === group) {
        ex.muscleGroup = 'Otro';
        changed = true;
      }
    });
    if (changed) this.saveData(exercises);
  }

  renameMuscleGroup(oldName: string, newName: string): void {
    const groups = this.getMuscleGroups();
    const index = groups.indexOf(oldName);
    if (index !== -1) {
      groups[index] = newName;
      this.saveMuscleGroups(groups);

      const exercises = this.loadData();
      let changed = false;
      exercises.forEach(ex => {
        if (ex.muscleGroup === oldName) {
          ex.muscleGroup = newName;
          changed = true;
        }
      });
      if (changed) this.saveData(exercises);
    }
  }

  getGroupSortPreference(): GroupSortPreference {
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
    }

    return DEFAULT_GROUP_SORT_PREFERENCE;
  }

  saveGroupSortPreference(preference: GroupSortPreference): void {
    localStorage.setItem(GROUP_SORT_KEY, JSON.stringify(preference));
  }

  getRoutines(): Routine[] {
    const parsed = safeParse<unknown>(localStorage.getItem(ROUTINES_KEY), []);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      const raw = item as { id?: unknown; name?: unknown; exercises?: unknown; exerciseIds?: unknown };
      if (typeof raw.id !== 'string' || typeof raw.name !== 'string') return [];
      if (Array.isArray(raw.exercises) && raw.exercises.every(isRoutineExerciseLike)) {
        const migrated = raw.exercises.map((re) => ({
          ...re,
          reps: typeof re.reps === 'number' ? String(re.reps) : re.reps,
          toFailure: re.toFailure ?? false,
        }));
        return [{ id: raw.id, name: raw.name, exercises: migrated }];
      }
      const exerciseIds = Array.isArray(raw.exerciseIds) ? raw.exerciseIds.filter((id): id is string => typeof id === 'string') : [];
      const migrated: RoutineExercise[] = exerciseIds.map((id) => ({
        exerciseId: id,
        sets: 3,
        reps: '10',
        dropset: false,
        toFailure: false,
      }));
      return [{ id: raw.id, name: raw.name, exercises: migrated }];
    });
  }

  saveRoutine(routine: Routine): void {
    const routines = this.getRoutines();
    const index = routines.findIndex((r) => r.id === routine.id);
    if (index >= 0) {
      routines[index] = routine;
    } else {
      routines.push(routine);
    }
    localStorage.setItem(ROUTINES_KEY, JSON.stringify(routines));
  }

  deleteRoutine(id: string): void {
    const routines = this.getRoutines().filter((r) => r.id !== id);
    localStorage.setItem(ROUTINES_KEY, JSON.stringify(routines));
  }

  reorderRoutineExercise(routineId: string, fromIndex: number, toIndex: number): void {
    const routines = this.getRoutines();
    const routine = routines.find((r) => r.id === routineId);
    if (!routine) return;
    const exercises = [...routine.exercises];
    const [moved] = exercises.splice(fromIndex, 1);
    exercises.splice(toIndex, 0, moved);
    routine.exercises = exercises;
    localStorage.setItem(ROUTINES_KEY, JSON.stringify(routines));
  }

  exportData(): string {
    const backup = {
      exercises: this.loadData(),
      groups: this.getMuscleGroups(),
      routines: this.getRoutines(),
    };
    return JSON.stringify(backup, null, 2);
  }

  importData(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString) as unknown;
      
      let exercisesToImport: Exercise[] = [];
      let groupsToImport: string[] = [];
      let routinesToImport: Routine[] = [];

      if (Array.isArray(parsed)) {
        exercisesToImport = parsed.filter(isExercise);
      } else if (typeof parsed === 'object' && parsed !== null && 'exercises' in parsed && Array.isArray((parsed as { exercises: unknown }).exercises)) {
        exercisesToImport = (parsed as { exercises: unknown[] }).exercises.filter(isExercise);
        if (Array.isArray((parsed as { groups?: unknown }).groups)) {
          groupsToImport = (parsed as { groups: unknown[] }).groups.filter((item): item is string => typeof item === 'string');
        }
        if (Array.isArray((parsed as { routines?: unknown }).routines)) {
        routinesToImport = (parsed as { routines: unknown[] }).routines.filter((routine): routine is Routine => {
          if (!isRoutine(routine)) return false;
          return routine.exercises.every((exercise) => typeof exercise.reps === 'string' || typeof exercise.reps === 'number');
        }).map((routine) => ({
          ...routine,
          exercises: routine.exercises.map((exercise) => ({
            ...exercise,
            reps: typeof exercise.reps === 'number' ? String(exercise.reps) : exercise.reps,
            toFailure: exercise.toFailure ?? false,
          })),
        }));
        }
      } else {
        return false;
      }

      const currentData = this.loadData();
      const newMap = new Map(currentData.map((item) => [item.id, item]));
      exercisesToImport.forEach((item: Exercise) => {
        newMap.set(item.id, item);
      });
      this.saveData(Array.from(newMap.values()));

      if (groupsToImport.length > 0) {
        const currentGroups = this.getMuscleGroups();
        const combinedGroups = Array.from(new Set([...currentGroups, ...groupsToImport]));
        this.saveMuscleGroups(combinedGroups);
      }

      if (routinesToImport.length > 0) {
        const currentRoutines = this.getRoutines();
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

export const storageManager = new LocalStorageManager();

export { makeId };
