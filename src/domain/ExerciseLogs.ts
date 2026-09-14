import type { ExerciseLog } from './Exercise';

export class ExerciseLogs {
  private constructor(private readonly logs: readonly ExerciseLog[]) {}

  static from(logs: readonly ExerciseLog[]): ExerciseLogs {
    return new ExerciseLogs(logs);
  }

  record(log: ExerciseLog): ExerciseLogs {
    const next = this.logs.some((item) => item.date === log.date)
      ? this.logs.map((item) => item.date === log.date ? log : item)
      : [...this.logs, log];
    return new ExerciseLogs(next);
  }

  replace(originalDate: string, log: ExerciseLog): ExerciseLogs | null {
    const originalIndex = this.logs.findIndex((item) => item.date === originalDate);
    if (originalIndex === -1) return null;

    const next = [...this.logs];
    const existingIndex = next.findIndex((item) => item.date === log.date);
    if (existingIndex !== -1 && existingIndex !== originalIndex) {
      next[existingIndex] = log;
      next.splice(originalIndex, 1);
    } else {
      next[originalIndex] = log;
    }
    return new ExerciseLogs(next);
  }

  without(date: string): ExerciseLogs {
    return new ExerciseLogs(this.logs.filter((log) => log.date !== date));
  }

  latest(): ExerciseLogs {
    return new ExerciseLogs(
      [...this.logs].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 1)
    );
  }

  clear(): ExerciseLogs {
    return new ExerciseLogs([]);
  }

  values(): ExerciseLog[] {
    return [...this.logs];
  }
}
