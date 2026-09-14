import type { TrainingRepository } from '../../domain/TrainingRepository';

export class ResetTrainingData {
  constructor(private readonly repository: TrainingRepository) {}

  async execute(): Promise<void> {
    await this.repository.resetData();
  }
}
