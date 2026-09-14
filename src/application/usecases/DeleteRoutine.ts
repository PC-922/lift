import type { TrainingRepository } from '../../domain/TrainingRepository';

export class DeleteRoutine {
  constructor(private readonly repository: TrainingRepository) {}

  async execute(id: string): Promise<void> {
    await this.repository.deleteRoutine(id);
  }
}
