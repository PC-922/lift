import type { Clock } from '../../domain/Clock';
import { ExerciseLogs } from '../../domain/ExerciseLogs';
import { exerciseService, type ExerciseService } from '../../domain/ExerciseService';
import type { TrainingRepository } from '../../domain/TrainingRepository';

export class KeepLatestExerciseLog {
  constructor(
    private readonly repository: TrainingRepository,
    private readonly clock: Clock,
    private readonly exercises: ExerciseService = exerciseService
  ) {}

  async execute(id: string): Promise<void> {
    const exercise = this.repository.getSnapshot().exercises.find((item) => item.id === id);
    if (!exercise || exercise.logs.length <= 1) return;
    const updated = this.exercises.withLogs(exercise, ExerciseLogs.from(exercise.logs).latest().values());
    await this.repository.saveExercise({ ...updated, updatedAt: this.clock.now() });
  }
}
