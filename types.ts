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
}

export interface WorkoutSet {
  weight: number | null;
  reps: number | null;
}

export interface WorkoutEntry {
  exerciseId: string;
  sets: WorkoutSet[];
}

export interface Workout {
  id: string;
  name: string;
  startedAt: string;
  finishedAt: string;
  routineId?: string;
  dayId?: string;
  entries: WorkoutEntry[];
  updatedAt?: string;
}
