import type { Clock } from '../../domain/Clock';
import { muscleGroupService, type MuscleGroupService } from '../../domain/MuscleGroupService';
import { routineService, type RoutineService } from '../../domain/RoutineService';
import type { TrainingRepository } from '../../domain/TrainingRepository';

export class DeleteMuscleGroup {
  constructor(
    private readonly repository: TrainingRepository,
    private readonly clock: Clock,
    private readonly groups: MuscleGroupService = muscleGroupService,
    private readonly routines: RoutineService = routineService
  ) {}

  async execute(group: string): Promise<void> {
    const { exercises, muscleGroups, routines } = this.repository.getSnapshot();
    const exerciseIds = this.groups.exerciseIds(exercises, group);
    await this.repository.saveMuscleGroups(this.groups.remove(muscleGroups, group));
    for (const id of exerciseIds) await this.repository.deleteExercise(id);
    for (const routine of routines) {
      const updated = this.routines.withoutExercises(routine, exerciseIds);
      if (updated) await this.repository.saveRoutine({ ...updated, updatedAt: this.clock.now() });
    }
  }
}
