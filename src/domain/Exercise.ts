export interface ExerciseLog {
  date: string;
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
