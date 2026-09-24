import type { ActiveWorkout, WorkoutExerciseTarget, WorkoutStartOptions } from './ActiveWorkout';
import type { Workout, WorkoutEntry, WorkoutSet } from './Workout';
import { newBlockId } from './BlockId';

export class WorkoutService {
  start(options: WorkoutStartOptions, id: string, startedAt: string): ActiveWorkout {
    return {
      id,
      startedAt,
      name: options.name ?? '',
      routineId: options.routineId,
      dayId: options.dayId,
      exercises: options.exercises.map(({ blockId, exerciseId, exerciseName, target }) => ({
        blockId: blockId || newBlockId(),
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

  removeSet(workout: ActiveWorkout | null, exerciseIndex: number, setIndex: number): ActiveWorkout | null {
    const exercise = workout?.exercises[exerciseIndex];
    if (!workout || !exercise || setIndex < 0 || setIndex >= exercise.sets.length) return workout;
    return {
      ...workout,
      exercises: workout.exercises.map((item, index) => index === exerciseIndex
        ? { ...item, sets: item.sets.filter((_, itemIndex) => itemIndex !== setIndex) }
        : item),
    };
  }

  restoreSet(
    workout: ActiveWorkout | null,
    exerciseIndex: number,
    setIndex: number,
    set: WorkoutSet
  ): ActiveWorkout | null {
    const exercise = workout?.exercises[exerciseIndex];
    if (!workout || !exercise || setIndex < 0 || setIndex > exercise.sets.length) return workout;
    return {
      ...workout,
      exercises: workout.exercises.map((item, index) => index === exerciseIndex
        ? { ...item, sets: [...item.sets.slice(0, setIndex), set, ...item.sets.slice(setIndex)] }
        : item),
    };
  }

  addExercise(
    workout: ActiveWorkout | null,
    exerciseId: string,
    target?: WorkoutExerciseTarget,
    exerciseName?: string
  ): ActiveWorkout | null {
    if (!workout) {
      return workout;
    }
    return {
      ...workout,
      exercises: [...workout.exercises, {
        blockId: newBlockId(),
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
    if (currentIndex < 0 || currentIndex >= workout.exercises.length) return workout;
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
          blockId: exercise.blockId,
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
