import type { Clock } from '../../domain/Clock';
import { exerciseService, type ExerciseService } from '../../domain/ExerciseService';
import type { TrainingRepository } from '../../domain/TrainingRepository';

export class UpdateExerciseDetails {
  constructor(
    private readonly repository: TrainingRepository,
    private readonly clock: Clock,
    private readonly exercises: ExerciseService = exerciseService
  ) {}

  async execute(id: string, name: string, muscleGroup: string): Promise<void> {
    const exercise = this.repository.getSnapshot().exercises.find((item) => item.id === id);
    if (!exercise) return;
    const updated = this.exercises.updateDetails(exercise, name, muscleGroup);
    if (updated) await this.repository.saveExercise({ ...updated, updatedAt: this.clock.now() });
  }
}
