import type { ActiveWorkout } from './ActiveWorkout';

export interface WorkoutDraftRepository {
  load(): ActiveWorkout | null;
  save(draft: ActiveWorkout | null): void;
}
