import type { Clock } from '../../domain/Clock';
import { ExerciseLogs } from '../../domain/ExerciseLogs';
import { exerciseService, type ExerciseService } from '../../domain/ExerciseService';
import type { TrainingRepository } from '../../domain/TrainingRepository';

export class LogExerciseSession {
  constructor(
    private readonly repository: TrainingRepository,
    private readonly clock: Clock,
    private readonly exercises: ExerciseService = exerciseService
  ) {}

  async execute(id: string, weight: number | null, reps: number | null): Promise<void> {
    const exercise = this.repository.getSnapshot().exercises.find((item) => item.id === id);
    if (!exercise) return;
    const logs = ExerciseLogs.from(exercise.logs).record({ date: this.clock.today(), weight, reps });
    const updated = this.exercises.withLogs(exercise, logs.values());
    await this.repository.saveExercise({ ...updated, updatedAt: this.clock.now() });
  }
}
