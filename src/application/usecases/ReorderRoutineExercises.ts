import type { Clock } from '../../domain/Clock';
import { routineService, type RoutineService } from '../../domain/RoutineService';
import type { TrainingRepository } from '../../domain/TrainingRepository';

export class ReorderRoutineExercises {
  constructor(
    private readonly repository: TrainingRepository,
    private readonly clock: Clock,
    private readonly routines: RoutineService = routineService
  ) {}

  async execute(routineId: string, dayId: string, from: number, to: number): Promise<void> {
    const routine = this.repository.getSnapshot().routines.find((item) => item.id === routineId);
    if (!routine) return;
    const updated = this.routines.reorderExercises(routine, dayId, from, to);
    if (updated) await this.repository.saveRoutine({ ...updated, updatedAt: this.clock.now() });
  }
}
