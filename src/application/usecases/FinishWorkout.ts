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
    const exercises = this.repository.getSnapshot().exercises;
    const names = new Map(exercises.map((exercise) => [exercise.id, exercise.name]));
    const completedWorkout = this.workouts.withExerciseNames(workout, names) ?? workout;
    await this.repository.saveWorkout({ ...completedWorkout, updatedAt: this.clock.now() });
    for (const entry of completedWorkout.entries) {
      const lastSet = this.workouts.lastRecordedSet(entry);
      const exercise = exercises.find((item) => item.id === entry.exerciseId);
      if (!lastSet || !exercise) continue;
      const logs = ExerciseLogs.from(exercise.logs).record({
        date: this.clock.today(),
        weight: lastSet.weight,
        reps: lastSet.reps,
      });
      await this.repository.saveExercise({ ...exercise, logs: logs.values(), updatedAt: this.clock.now() });
    }
  }
}
