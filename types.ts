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
  order?: number;
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
  order?: number;
}

export type GroupSortField = 'progress' | 'weight';
export type SortDirection = 'asc' | 'desc';

export interface GroupSortPreference {
  field: GroupSortField;
  direction: SortDirection;
}

export interface RestTimerState {
  remainingTime: number;
  isActive: boolean;
  duration: number;
  isMinimized: boolean;
}
