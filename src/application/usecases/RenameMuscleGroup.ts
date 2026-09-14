import type { Clock } from '../../domain/Clock';
import { muscleGroupService, type MuscleGroupService } from '../../domain/MuscleGroupService';
import type { TrainingRepository } from '../../domain/TrainingRepository';

export class RenameMuscleGroup {
  constructor(
    private readonly repository: TrainingRepository,
    private readonly clock: Clock,
    private readonly groups: MuscleGroupService = muscleGroupService
  ) {}

  async execute(oldName: string, newName: string): Promise<void> {
    const { exercises, muscleGroups } = this.repository.getSnapshot();
    const updatedGroups = this.groups.rename(muscleGroups, oldName, newName);
    if (!updatedGroups) return;
    await this.repository.saveMuscleGroups(updatedGroups);
    for (const exercise of exercises) {
      const updated = this.groups.renameExercise(exercise, oldName, newName);
      if (updated) await this.repository.saveExercise({ ...updated, updatedAt: this.clock.now() });
    }
  }
}
