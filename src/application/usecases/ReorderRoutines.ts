import type { Clock } from '../../domain/Clock';
import { routineService, type RoutineService } from '../../domain/RoutineService';
import type { TrainingRepository } from '../../domain/TrainingRepository';

export class ReorderRoutines {
  constructor(
    private readonly repository: TrainingRepository,
    private readonly clock: Clock,
    private readonly routines: RoutineService = routineService
  ) {}

  async execute(from: number, to: number): Promise<void> {
    const current = this.repository.getSnapshot().routines;
    const reordered = this.routines.reorder(current, from, to);
    if (!reordered) return;
    for (const routine of reordered) {
      const previous = current.find((item) => item.id === routine.id);
      if (previous?.order !== routine.order) {
        await this.repository.saveRoutine({ ...routine, updatedAt: this.clock.now() });
      }
    }
  }
}
