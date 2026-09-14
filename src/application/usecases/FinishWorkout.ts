import type { Workout } from '../../domain';
import type { Clock } from '../../domain/Clock';
import { ExerciseLogs } from '../../domain/ExerciseLogs';
import type { TrainingRepository } from '../../domain/TrainingRepository';
import { workoutService, type WorkoutService } from '../../domain/WorkoutService';

export class FinishWorkout {
  constructor(
    private readonly repository: TrainingRepository,
    private readonly clock: Clock,
    private readonly workouts: WorkoutService = workoutService
  ) {}

  async execute(workout: Workout): Promise<void> {
    await this.repository.saveWorkout({ ...workout, updatedAt: this.clock.now() });
    const exercises = this.repository.getSnapshot().exercises;
    for (const entry of workout.entries) {
      const best = this.workouts.bestSet(entry);
      const exercise = exercises.find((item) => item.id === entry.exerciseId);
      if (!best || !exercise) continue;
      const logs = ExerciseLogs.from(exercise.logs).record({
        date: this.clock.today(),
        weight: best.weight,
        reps: best.reps,
      });
      await this.repository.saveExercise({ ...exercise, logs: logs.values(), updatedAt: this.clock.now() });
    }
  }
}
