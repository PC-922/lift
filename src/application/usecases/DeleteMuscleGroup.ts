import type { Clock } from '../../domain/Clock';
import { muscleGroupService, type MuscleGroupService } from '../../domain/MuscleGroupService';
import { routineService, type RoutineService } from '../../domain/RoutineService';
import type { TrainingRepository } from '../../domain/TrainingRepository';
import { workoutService, type WorkoutService } from '../../domain/WorkoutService';

export class DeleteMuscleGroup {
  constructor(
    private readonly repository: TrainingRepository,
    private readonly clock: Clock,
    private readonly groups: MuscleGroupService = muscleGroupService,
    private readonly routines: RoutineService = routineService,
    private readonly workouts: WorkoutService = workoutService
  ) {}

  async execute(group: string): Promise<void> {
    const { exercises, muscleGroups, routines, workouts } = this.repository.getSnapshot();
    const exerciseIds = this.groups.exerciseIds(exercises, group);
    const updatedAt = this.clock.now();
    const exerciseNames = new Map(
      exercises
        .filter((exercise) => exerciseIds.has(exercise.id))
        .map((exercise) => [exercise.id, exercise.name])
    );

    for (const routine of routines) {
      const updated = this.routines.withoutExercises(routine, exerciseIds);
      if (updated) await this.repository.saveRoutine({ ...updated, updatedAt });
    }
    for (const workout of workouts) {
      const updated = this.workouts.withExerciseNames(workout, exerciseNames);
      if (updated) await this.repository.saveWorkout({ ...updated, updatedAt });
    }
    for (const id of exerciseIds) await this.repository.deleteExercise(id);
    await this.repository.saveMuscleGroups(this.groups.remove(muscleGroups, group));
  }
}
