import type { Clock } from '../../domain/Clock';
import { ExerciseLogs } from '../../domain/ExerciseLogs';
import { exerciseService, type ExerciseService } from '../../domain/ExerciseService';
import type { TrainingRepository } from '../../domain/TrainingRepository';

export class DeleteExerciseLogs {
  constructor(
    private readonly repository: TrainingRepository,
    private readonly clock: Clock,
    private readonly exercises: ExerciseService = exerciseService
  ) {}

  async execute(id: string): Promise<void> {
    const exercise = this.repository.getSnapshot().exercises.find((item) => item.id === id);
    if (!exercise) return;
    const updated = this.exercises.withLogs(exercise, ExerciseLogs.from(exercise.logs).clear().values());
    await this.repository.saveExercise({ ...updated, updatedAt: this.clock.now() });
  }
}
