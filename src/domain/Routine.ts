export interface RoutineExercise {
  exerciseId: string;
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
