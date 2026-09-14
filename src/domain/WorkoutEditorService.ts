import type { Workout, WorkoutSet } from './Workout';

export class WorkoutEditorService {
  create(id: string, startedAt: string): Workout {
    const finishedAt = new Date(Date.parse(startedAt) + 60 * 60 * 1000).toISOString();
    return { id, name: '', startedAt, finishedAt, entries: [] };
  }

  setStartedAt(workout: Workout, startedAt: string): Workout {
    const duration = Math.max(0, Date.parse(workout.finishedAt) - Date.parse(workout.startedAt));
    return { ...workout, startedAt, finishedAt: new Date(Date.parse(startedAt) + duration).toISOString() };
  }

  setDuration(workout: Workout, minutes: number): Workout {
    const safeMinutes = Number.isFinite(minutes) ? Math.max(0, minutes) : 0;
    return {
      ...workout,
      finishedAt: new Date(Date.parse(workout.startedAt) + safeMinutes * 60 * 1000).toISOString(),
    };
  }

  addExercise(workout: Workout, exerciseId: string): Workout {
    if (!exerciseId || workout.entries.some((entry) => entry.exerciseId === exerciseId)) return workout;
    return { ...workout, entries: [...workout.entries, { exerciseId, sets: [] }] };
  }

  replaceExercise(workout: Workout, entryIndex: number, exerciseId: string): Workout {
    if (!exerciseId || workout.entries.some((entry, index) => index !== entryIndex && entry.exerciseId === exerciseId)) {
      return workout;
    }
    return {
      ...workout,
      entries: workout.entries.map((entry, index) => index === entryIndex ? { ...entry, exerciseId } : entry),
    };
  }

  removeExercise(workout: Workout, entryIndex: number): Workout {
    return { ...workout, entries: workout.entries.filter((_, index) => index !== entryIndex) };
  }

  addSet(workout: Workout, entryIndex: number): Workout {
    return this.changeSets(workout, entryIndex, (sets) => [...sets, { weight: null, reps: null }]);
  }

  updateSet(workout: Workout, entryIndex: number, setIndex: number, set: WorkoutSet): Workout {
    return this.changeSets(workout, entryIndex, (sets) => sets.map((item, index) => index === setIndex ? set : item));
  }

  removeSet(workout: Workout, entryIndex: number, setIndex: number): Workout {
    return this.changeSets(workout, entryIndex, (sets) => sets.filter((_, index) => index !== setIndex));
  }

  private changeSets(workout: Workout, entryIndex: number, change: (sets: WorkoutSet[]) => WorkoutSet[]): Workout {
    return {
      ...workout,
      entries: workout.entries.map((entry, index) => index === entryIndex
        ? { ...entry, sets: change(entry.sets) }
        : entry),
    };
  }
}

export const workoutEditorService = new WorkoutEditorService();
