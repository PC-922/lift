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
      exercises: options.exercises.map(({ exerciseId, target }) => ({
        exerciseId,
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
    if (!workout || (weight === null && reps === null)) return workout;
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
    target?: WorkoutExerciseTarget
  ): ActiveWorkout | null {
    if (!workout || workout.exercises.some((exercise) => exercise.exerciseId === exerciseId)) {
      return workout;
    }
    return { ...workout, exercises: [...workout.exercises, { exerciseId, sets: [], target }] };
  }

  replaceExercise(
    workout: ActiveWorkout | null,
    currentIndex: number,
    exerciseId: string
  ): ActiveWorkout | null {
    if (!workout) return null;
    return {
      ...workout,
      exercises: workout.exercises.map((exercise, index) => index === currentIndex
        ? { ...exercise, exerciseId, sets: [] }
        : exercise),
    };
  }

  removeExercise(workout: ActiveWorkout | null, index: number): ActiveWorkout | null {
    if (!workout || workout.exercises.length <= 1) return workout;
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
        .map((exercise) => ({ exerciseId: exercise.exerciseId, sets: exercise.sets }))
        .filter((entry) => entry.sets.length > 0),
    };
  }

  lastRecordedSet(entry: WorkoutEntry): WorkoutSet | null {
    return [...entry.sets]
      .reverse()
      .find((set) => set.weight !== null || set.reps !== null) ?? null;
  }
}

export const workoutService = new WorkoutService();
