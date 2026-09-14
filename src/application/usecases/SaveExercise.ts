import type { Exercise } from '../../domain';
import type { Clock } from '../../domain/Clock';
import type { TrainingRepository } from '../../domain/TrainingRepository';

export class SaveExercise {
  constructor(private readonly repository: TrainingRepository, private readonly clock: Clock) {}

  async execute(exercise: Exercise): Promise<void> {
    await this.repository.saveExercise({ ...exercise, updatedAt: this.clock.now() });
  }
}
