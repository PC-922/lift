import type { Exercise, Routine, RoutineDay, RoutineExercise } from '../domain';
import type { Clock } from '../domain/Clock';
import type { IdGenerator } from '../domain/IdGenerator';
import {
  createSharedRoutine,
  parseSharedRoutine,
  serializeSharedRoutine,
  type SharedRoutine,
  type SharedRoutineExercise,
} from './SharedRoutineSerializer';

export type { SharedRoutine } from './SharedRoutineSerializer';

export interface RoutineImportResult {
  routine: Routine;
  createdExercises: Exercise[];
}

export class RoutineSharingService {
  constructor(
    private readonly ids: IdGenerator,
    private readonly clock: Clock
  ) {}

  create(routine: Routine, exercises: Exercise[]): SharedRoutine {
    return createSharedRoutine(routine, exercises);
  }

  serialize(shared: SharedRoutine): string {
    return serializeSharedRoutine(shared);
  }

  parse(json: string): SharedRoutine | null {
    return parseSharedRoutine(json);
  }

  import(shared: SharedRoutine, exercises: Exercise[]): RoutineImportResult {
    const existing = new Map(exercises.map((exercise) => [this.key(exercise.name, exercise.muscleGroup), exercise]));
    const createdExercises: Exercise[] = [];
    const days: RoutineDay[] = shared.days.map((day) => ({
      id: this.ids.generate('day'),
      name: day.name,
      exercises: day.exercises.map((item) => this.importExercise(item, existing, createdExercises)),
    }));

    return {
      routine: {
        id: this.ids.generate('routine'),
        name: shared.name,
        days,
        updatedAt: this.clock.now(),
      },
      createdExercises,
    };
  }

  private importExercise(
    shared: SharedRoutineExercise,
    existing: Map<string, Exercise>,
    created: Exercise[]
  ): RoutineExercise {
    const key = this.key(shared.name, shared.muscleGroup);
    let exercise = existing.get(key);
    if (!exercise) {
      exercise = {
        id: this.ids.generate('exercise'),
        name: shared.name.trim(),
        muscleGroup: shared.muscleGroup.trim(),
        logs: [],
        updatedAt: this.clock.now(),
      };
      existing.set(key, exercise);
      created.push(exercise);
    }

    return {
      exerciseId: exercise.id,
      sets: shared.sets,
      reps: shared.reps,
      dropset: shared.dropset,
      toFailure: shared.toFailure,
      restSeconds: shared.restSeconds,
    };
  }

  private key(name: string, muscleGroup: string): string {
    return `${name.trim().toLowerCase()}|${muscleGroup.trim().toLowerCase()}`;
  }
}
