import type { Exercise, Routine, Workout } from './index';

export interface SyncStatus {
  hasPendingWrites: boolean;
  fromCache: boolean;
}

export interface TrainingSnapshot {
  exercises: Exercise[];
  routines: Routine[];
  muscleGroups: string[];
  workouts: Workout[];
}

export interface TrainingRepository {
  getSnapshot(): TrainingSnapshot;
  subscribe(
    onData: (snapshot: TrainingSnapshot) => void,
    onStatus: (status: SyncStatus) => void
  ): () => void;
  saveExercise(exercise: Exercise): Promise<void>;
  deleteExercise(id: string): Promise<void>;
  saveRoutine(routine: Routine): Promise<void>;
  deleteRoutine(id: string): Promise<void>;
  saveMuscleGroups(groups: string[]): Promise<void>;
  saveWorkout(workout: Workout): Promise<void>;
  deleteWorkout(id: string): Promise<void>;
  resetData(): Promise<void>;
}
