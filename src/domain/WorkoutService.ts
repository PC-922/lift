import type { ActiveWorkout, WorkoutExerciseTarget, WorkoutStartOptions } from './ActiveWorkout';
import type { Workout, WorkoutEntry, WorkoutSet } from './Workout';

export class WorkoutService {
  start(options: WorkoutStartOptions, id: string, startedAt: string): ActiveWorkout {
    return {
      id,
      startedAt,
      name: options.name ?? '',
      routineId: options.routineId,
      dayId: options.dayId,
      exercises: options.exercises.map(({ exerciseId, exerciseName, target }) => ({
        exerciseId,
        ...(exerciseName ? { exerciseName } : {}),
        sets: [],
        target,
      })),
    };
  }

  recordSet(
    workout: ActiveWorkout | null,
    currentIndex: number,
    weight: number | null,
    reps: number | null
  ): ActiveWorkout | null {
    if (
      !workout
      || currentIndex < 0
      || currentIndex >= workout.exercises.length
      || (weight === null && reps === null)
    ) return workout;
    return {
      ...workout,
      exercises: workout.exercises.map((exercise, index) => index === currentIndex
        ? { ...exercise, sets: [...exercise.sets, { weight, reps }] }
        : exercise),
    };
  }

  addExercise(
    workout: ActiveWorkout | null,
    exerciseId: string,
    target?: WorkoutExerciseTarget,
    exerciseName?: string
  ): ActiveWorkout | null {
    if (!workout || workout.exercises.some((exercise) => exercise.exerciseId === exerciseId)) {
      return workout;
    }
    return {
      ...workout,
      exercises: [...workout.exercises, {
        exerciseId,
        ...(exerciseName ? { exerciseName } : {}),
        sets: [],
        target,
      }],
    };
  }

  replaceExercise(
    workout: ActiveWorkout | null,
    currentIndex: number,
    exerciseId: string,
    exerciseName?: string
  ): ActiveWorkout | null {
    if (!workout) return null;
    if (
      currentIndex < 0
      || currentIndex >= workout.exercises.length
      || workout.exercises.some((exercise, index) => (
        index !== currentIndex && exercise.exerciseId === exerciseId
      ))
    ) return workout;
    return {
      ...workout,
      exercises: workout.exercises.map((exercise, index) => index === currentIndex
        ? {
          ...exercise,
          exerciseId,
          ...(exerciseName ? { exerciseName } : { exerciseName: undefined }),
          sets: [],
        }
        : exercise),
    };
  }

  removeExercise(workout: ActiveWorkout | null, index: number): ActiveWorkout | null {
    if (!workout || workout.exercises.length <= 1 || index < 0 || index >= workout.exercises.length) {
      return workout;
    }
    return { ...workout, exercises: workout.exercises.filter((_, itemIndex) => itemIndex !== index) };
  }

  finish(workout: ActiveWorkout, finishedAt: string): Workout {
    return {
      id: workout.id,
      name: workout.name,
      startedAt: workout.startedAt,
      finishedAt,
      routineId: workout.routineId,
      dayId: workout.dayId,
      entries: workout.exercises
        .map((exercise) => ({
          exerciseId: exercise.exerciseId,
          ...(exercise.exerciseName ? { exerciseName: exercise.exerciseName } : {}),
          sets: exercise.sets,
        }))
        .filter((entry) => entry.sets.length > 0),
    };
  }

  lastRecordedSet(entry: WorkoutEntry): WorkoutSet | null {
    return [...entry.sets]
      .reverse()
      .find((set) => set.weight !== null || set.reps !== null) ?? null;
  }

  withExerciseNames(
    workout: Workout,
    exerciseNames: ReadonlyMap<string, string>
  ): Workout | null {
    let changed = false;
    const entries = workout.entries.map((entry) => {
      const exerciseName = exerciseNames.get(entry.exerciseId);
      if (!exerciseName || exerciseName === entry.exerciseName) return entry;
      changed = true;
      return { ...entry, exerciseName };
    });
    return changed ? { ...workout, entries } : null;
  }
}

export const workoutService = new WorkoutService();
