import type { Clock } from '../../domain/Clock';
import type { TrainingRepository } from '../../domain/TrainingRepository';
import { parseBackup } from '../BackupSerializer';

export class ImportBackup {
  constructor(private readonly repository: TrainingRepository, private readonly clock: Clock) {}

  async execute(json: string): Promise<boolean> {
    const backup = parseBackup(json);
    if (!backup) return false;
    const snapshot = this.repository.getSnapshot();
    const exerciseOrder = this.nextOrder(snapshot.exercises);
    const routineOrder = this.nextOrder(snapshot.routines);
    await this.repository.saveMuscleGroups(backup.muscleGroups);
    for (const [index, exercise] of backup.exercises.entries()) {
      await this.repository.saveExercise({ ...exercise, order: exerciseOrder + index });
    }
    for (const [index, routine] of backup.routines.entries()) {
      await this.repository.saveRoutine({
        ...routine,
        order: routineOrder + index,
        updatedAt: this.clock.now(),
      });
    }
    return true;
  }

  private nextOrder(items: ReadonlyArray<{ order?: number }>): number {
    return items.reduce((highest, item) => Math.max(highest, item.order ?? -1), -1) + 1;
  }
}
