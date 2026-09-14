import type { Exercise, ExerciseLog } from './Exercise';

export class ExerciseService {
  updateDetails(exercise: Exercise, name: string, muscleGroup: string): Exercise | null {
    const normalizedName = name.trim();
    const normalizedGroup = muscleGroup.trim();
    if (normalizedName.length === 0 || normalizedGroup.length === 0) return null;
    return { ...exercise, name: normalizedName, muscleGroup: normalizedGroup };
  }

  updateNote(exercise: Exercise, note: string): Exercise {
    const normalized = note.trim();
    return { ...exercise, note: normalized.length > 0 ? normalized : undefined };
  }

  withLogs(exercise: Exercise, logs: readonly ExerciseLog[]): Exercise {
    return { ...exercise, logs: [...logs] };
  }
}

export const exerciseService = new ExerciseService();
