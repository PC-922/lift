export interface ExerciseLog {
  date: string; // ISO Date String (YYYY-MM-DD)
  weight: number;
  reps: number;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  logs: ExerciseLog[];
  note?: string;
}

export interface RoutineExercise {
  exerciseId: string;
  alternativeExerciseId?: string;
  sets: number;
  reps: string;
  dropset: boolean;
  toFailure: boolean;
}

export interface Routine {
  id: string;
  name: string;
  exercises: RoutineExercise[];
}

export type GroupSortField = 'progress' | 'weight';
export type SortDirection = 'asc' | 'desc';

export interface GroupSortPreference {
  field: GroupSortField;
  direction: SortDirection;
}

export interface StorageManagerInterface {
  getExercises(): Exercise[];
  saveExercise(exercise: Exercise): void;
  deleteExercise(id: string): void;
  updateExerciseDetails(id: string, name: string, muscleGroup: string): void;
  logSession(exerciseId: string, weight: number, reps: number): void;
  updateExerciseNote(id: string, note: string): void;
  updateExerciseLog(exerciseId: string, originalDate: string, log: ExerciseLog): void;
  deleteExerciseLog(exerciseId: string, date: string): void;
  getMuscleGroups(): string[];
  addMuscleGroup(group: string): void;
  deleteMuscleGroup(group: string): void;
  renameMuscleGroup(oldName: string, newName: string): void;
  getGroupSortPreference(): GroupSortPreference;
  saveGroupSortPreference(preference: GroupSortPreference): void;
  getRoutines(): Routine[];
  saveRoutine(routine: Routine): void;
  deleteRoutine(id: string): void;
  reorderRoutine(fromIndex: number, toIndex: number): void;
  reorderRoutineExercise(routineId: string, fromIndex: number, toIndex: number): void;
}
