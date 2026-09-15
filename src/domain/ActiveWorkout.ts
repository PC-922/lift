import type { WorkoutSet } from './index';

export interface WorkoutExerciseTarget {
  sets: number;
  reps: string;
  restSeconds?: number;
}

export interface ActiveExercise {
  exerciseId: string;
  exerciseName?: string;
  sets: WorkoutSet[];
  target?: WorkoutExerciseTarget;
}

export interface ActiveWorkout {
  id: string;
  name: string;
  startedAt: string;
  routineId?: string;
  dayId?: string;
  exercises: ActiveExercise[];
}

export interface WorkoutStartOptions {
  name?: string;
  routineId?: string;
  dayId?: string;
  exercises: { exerciseId: string; exerciseName?: string; target?: WorkoutExerciseTarget }[];
}
