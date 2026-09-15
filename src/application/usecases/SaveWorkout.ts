import type { Workout } from '../../domain';
import type { Clock } from '../../domain/Clock';
import type { TrainingRepository } from '../../domain/TrainingRepository';
import { workoutService, type WorkoutService } from '../../domain/WorkoutService';

export class SaveWorkout {
  constructor(
    private readonly repository: TrainingRepository,
    private readonly clock: Clock,
    private readonly workouts: WorkoutService = workoutService
  ) {}

  async execute(workout: Workout): Promise<void> {
    const names = new Map(
      this.repository.getSnapshot().exercises.map((exercise) => [exercise.id, exercise.name])
    );
    const namedWorkout = this.workouts.withExerciseNames(workout, names) ?? workout;
    await this.repository.saveWorkout({ ...namedWorkout, updatedAt: this.clock.now() });
  }
}
