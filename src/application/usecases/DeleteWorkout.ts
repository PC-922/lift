import type { TrainingRepository } from '../../domain/TrainingRepository';

export class DeleteWorkout {
  constructor(private readonly repository: TrainingRepository) {}

  async execute(id: string): Promise<void> {
    await this.repository.deleteWorkout(id);
  }
}
