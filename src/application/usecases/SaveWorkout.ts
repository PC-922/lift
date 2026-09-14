import type { Workout } from '../../domain';
import type { Clock } from '../../domain/Clock';
import type { TrainingRepository } from '../../domain/TrainingRepository';

export class SaveWorkout {
  constructor(private readonly repository: TrainingRepository, private readonly clock: Clock) {}

  async execute(workout: Workout): Promise<void> {
    await this.repository.saveWorkout({ ...workout, updatedAt: this.clock.now() });
  }
}
