export interface WorkoutSet {
  weight: number | null;
  reps: number | null;
}

export interface WorkoutEntry {
  blockId: string;
  exerciseId: string;
  exerciseName?: string;
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
