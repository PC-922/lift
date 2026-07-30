export interface ExerciseLog {
  date: string; // ISO Date String (YYYY-MM-DD)
  weight: number | null;
  reps: number | null;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  logs: ExerciseLog[];
  note?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface RoutineExercise {
  exerciseId: string;
  alternativeExerciseId?: string;
  sets: number;
  reps: string;
  dropset: boolean;
  toFailure: boolean;
  restSeconds?: number;
}

export interface RoutineDay {
  id: string;
  name: string;
  exercises: RoutineExercise[];
}

export interface Routine {
  id: string;
  name: string;
  days: RoutineDay[];
  updatedAt?: string;
  deletedAt?: string | null;
}

export type GroupSortField = 'progress' | 'weight';
export type SortDirection = 'asc' | 'desc';

export interface GroupSortPreference {
  field: GroupSortField;
  direction: SortDirection;
}

export interface StorageManagerInterface {
  getExercises(): Promise<Exercise[]>;
  saveExercise(exercise: Exercise): Promise<void>;
  deleteExercise(id: string): Promise<void>;
  updateExerciseDetails(id: string, name: string, muscleGroup: string): Promise<void>;
  logSession(exerciseId: string, weight: number | null, reps: number | null): Promise<void>;
  updateExerciseNote(id: string, note: string): Promise<void>;
  updateExerciseLog(exerciseId: string, originalDate: string, log: ExerciseLog): Promise<void>;
  deleteExerciseLog(exerciseId: string, date: string): Promise<void>;
  deleteAllLogs(exerciseId: string): Promise<void>;
  deleteAllLogsExceptLatest(exerciseId: string): Promise<void>;
  getMuscleGroups(): Promise<string[]>;
  addMuscleGroup(group: string): Promise<void>;
  deleteMuscleGroup(group: string): Promise<void>;
  renameMuscleGroup(oldName: string, newName: string): Promise<void>;
  getGroupSortPreference(): Promise<GroupSortPreference>;
  saveGroupSortPreference(preference: GroupSortPreference): Promise<void>;
  getRoutines(): Promise<Routine[]>;
  saveRoutine(routine: Routine): Promise<void>;
  deleteRoutine(id: string): Promise<void>;
  reorderRoutine(fromIndex: number, toIndex: number): Promise<void>;
  reorderRoutineExercise(routineId: string, dayId: string, fromIndex: number, toIndex: number): Promise<void>;
  exportData(): Promise<string>;
  importData(jsonString: string): Promise<boolean>;
  resetData(): Promise<void>;
  sync?(): Promise<void>;
  getTombstones?(): { exercises: Record<string, Tombstone>; routines: Record<string, Tombstone> };
  replaceAllData?(exercises: Exercise[], routines: Routine[], groups: string[], tombstones: { exercises: Record<string, Tombstone>; routines: Record<string, Tombstone> }): Promise<void>;
}

export interface Tombstone {
  deletedAt: string;
}

export interface RestTimerState {
  remainingTime: number;
  isActive: boolean;
  duration: number;
  isMinimized: boolean;
}
