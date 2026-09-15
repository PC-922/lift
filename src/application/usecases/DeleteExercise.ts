import type { Clock } from '../../domain/Clock';
import { routineService, type RoutineService } from '../../domain/RoutineService';
import type { TrainingRepository } from '../../domain/TrainingRepository';
import { workoutService, type WorkoutService } from '../../domain/WorkoutService';

export class DeleteExercise {
  constructor(
    private readonly repository: TrainingRepository,
    private readonly clock: Clock,
    private readonly routines: RoutineService = routineService,
    private readonly workouts: WorkoutService = workoutService
  ) {}

  async execute(id: string): Promise<void> {
    const snapshot = this.repository.getSnapshot();
    const exercise = snapshot.exercises.find((item) => item.id === id);
    const updatedAt = this.clock.now();
    const exerciseIds = new Set([id]);

    for (const routine of snapshot.routines) {
      const updated = this.routines.withoutExercises(routine, exerciseIds);
      if (updated) await this.repository.saveRoutine({ ...updated, updatedAt });
    }

    if (exercise) {
      const names = new Map([[exercise.id, exercise.name]]);
      for (const workout of snapshot.workouts) {
        const updated = this.workouts.withExerciseNames(workout, names);
        if (updated) await this.repository.saveWorkout({ ...updated, updatedAt });
      }
    }

    await this.repository.deleteExercise(id);
  }
}
