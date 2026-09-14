import { muscleGroupService, type MuscleGroupService } from '../../domain/MuscleGroupService';
import type { TrainingRepository } from '../../domain/TrainingRepository';

export class AddMuscleGroup {
  constructor(
    private readonly repository: TrainingRepository,
    private readonly groups: MuscleGroupService = muscleGroupService
  ) {}

  async execute(group: string): Promise<void> {
    const updated = this.groups.add(this.repository.getSnapshot().muscleGroups, group);
    if (updated) await this.repository.saveMuscleGroups(updated);
  }
}
