import type { TrainingRepository } from '../../domain/TrainingRepository';

export class DeleteExercise {
  constructor(private readonly repository: TrainingRepository) {}

  async execute(id: string): Promise<void> {
    await this.repository.deleteExercise(id);
  }
}
