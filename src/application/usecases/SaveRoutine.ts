import type { Routine } from '../../domain';
import type { Clock } from '../../domain/Clock';
import type { TrainingRepository } from '../../domain/TrainingRepository';

export class SaveRoutine {
  constructor(private readonly repository: TrainingRepository, private readonly clock: Clock) {}

  async execute(routine: Routine): Promise<void> {
    const routines = this.repository.getSnapshot().routines;
    const existing = routines.find((item) => item.id === routine.id);
    await this.repository.saveRoutine({
      ...routine,
      order: existing?.order ?? routines.length,
      updatedAt: this.clock.now(),
    });
  }
}
