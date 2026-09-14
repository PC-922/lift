import type { Routine, RoutineExercise } from './Routine';

export class RoutineService {
  reorder(routines: readonly Routine[], from: number, to: number): Routine[] | null {
    if (!this.validIndex(from, routines) || !this.validIndex(to, routines)) return null;
    const reordered = [...routines];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    return reordered.map((routine, order) => ({ ...routine, order }));
  }

  reorderExercises(routine: Routine, dayId: string, from: number, to: number): Routine | null {
    const day = routine.days.find((item) => item.id === dayId);
    if (!day || !this.validIndex(from, day.exercises) || !this.validIndex(to, day.exercises)) {
      return null;
    }
    const exercises = [...day.exercises];
    const [moved] = exercises.splice(from, 1);
    exercises.splice(to, 0, moved);
    return {
      ...routine,
      days: routine.days.map((item) => item.id === dayId ? { ...item, exercises } : item),
    };
  }

  withoutExercises(routine: Routine, exerciseIds: ReadonlySet<string>): Routine | null {
    const days = routine.days.map((day) => ({
      ...day,
      exercises: day.exercises.filter((exercise) => !exerciseIds.has(exercise.exerciseId)),
    }));
    const changed = days.some((day, index) => day.exercises.length !== routine.days[index].exercises.length);
    return changed ? { ...routine, days } : null;
  }

  private validIndex(index: number, values: readonly Routine[] | readonly RoutineExercise[]): boolean {
    return index >= 0 && index < values.length;
  }
}

export const routineService = new RoutineService();
