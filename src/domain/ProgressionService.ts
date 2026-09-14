import type { ExerciseLog } from './Exercise';

export type ProgressionType = 'weight' | 'reps' | 'both';

export type LogFeedback =
  | { type: 'first' }
  | { type: 'progress'; kind: ProgressionType }
  | { type: 'regression'; kind: ProgressionType };

export interface ProgressionChange {
  type: ProgressionType;
  date: string;
  prevWeight: number;
  currWeight: number;
  prevReps: number;
  currReps: number;
}

type Direction = 'progress' | 'regression';

export class ProgressionService {
  feedback(
    weight: number | null,
    reps: number | null,
    previousWeight: number | null,
    previousReps: number | null,
    isFirst: boolean
  ): LogFeedback | null {
    if (isFirst) return { type: 'first' };
    if (weight === null || previousWeight === null) return null;

    const weightChanged = weight - previousWeight;
    const repsChanged = reps !== null && previousReps !== null ? reps - previousReps : 0;
    if (weightChanged > 0) return { type: 'progress', kind: repsChanged > 0 ? 'both' : 'weight' };
    if (weightChanged < 0) return { type: 'regression', kind: repsChanged < 0 ? 'both' : 'weight' };
    if (repsChanged > 0) return { type: 'progress', kind: 'reps' };
    if (repsChanged < 0) return { type: 'regression', kind: 'reps' };
    return null;
  }

  latestLog(logs: readonly ExerciseLog[]): ExerciseLog | null {
    if (logs.length === 0) return null;
    return [...logs].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];
  }

  lastProgression(logs: readonly ExerciseLog[]): ProgressionChange | null {
    return this.findLastChange(logs, 'progress');
  }

  lastRegression(logs: readonly ExerciseLog[]): ProgressionChange | null {
    return this.findLastChange(logs, 'regression');
  }

  private findLastChange(
    logs: readonly ExerciseLog[],
    direction: Direction
  ): ProgressionChange | null {
    const sorted = [...logs].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
    for (let index = sorted.length - 1; index > 0; index--) {
      const current = sorted[index];
      const previous = sorted[index - 1];
      const weightChange = current.weight !== null && previous.weight !== null
        ? current.weight - previous.weight
        : 0;
      const repsChange = current.reps !== null && previous.reps !== null
        ? current.reps - previous.reps
        : 0;
      const matches = direction === 'progress'
        ? weightChange > 0 || (weightChange === 0 && repsChange > 0)
        : weightChange < 0 || (weightChange === 0 && repsChange < 0);
      if (!matches) continue;

      const type: ProgressionType = weightChange !== 0
        ? repsChange * weightChange > 0 ? 'both' : 'weight'
        : 'reps';
      return {
        type,
        date: current.date,
        prevWeight: previous.weight ?? 0,
        currWeight: current.weight ?? 0,
        prevReps: previous.reps ?? 0,
        currReps: current.reps ?? 0,
      };
    }
    return null;
  }
}

export const progressionService = new ProgressionService();
