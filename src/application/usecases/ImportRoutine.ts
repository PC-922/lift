import type { TrainingRepository } from '../../domain/TrainingRepository';
import { RoutineSharingService } from '../RoutineSharingService';

export class ImportRoutine {
  constructor(
    private readonly repository: TrainingRepository,
    private readonly sharing: RoutineSharingService
  ) {}

  async execute(json: string): Promise<boolean> {
    const shared = this.sharing.parse(json);
    if (!shared) return false;
    const snapshot = this.repository.getSnapshot();
    const result = this.sharing.import(shared, snapshot.exercises);
    const nextExerciseOrder = this.nextOrder(snapshot.exercises);
    for (const [index, exercise] of result.createdExercises.entries()) {
      await this.repository.saveExercise({ ...exercise, order: nextExerciseOrder + index });
    }
    await this.repository.saveRoutine({ ...result.routine, order: this.nextOrder(snapshot.routines) });
    const groups = result.createdExercises.map((exercise) => exercise.muscleGroup);
    await this.repository.saveMuscleGroups([...new Set([...snapshot.muscleGroups, ...groups])]);
    return true;
  }

  private nextOrder(items: ReadonlyArray<{ order?: number }>): number {
    return items.reduce((highest, item) => Math.max(highest, item.order ?? -1), -1) + 1;
  }
}
