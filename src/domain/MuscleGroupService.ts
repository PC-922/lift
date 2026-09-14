import type { Exercise } from './Exercise';

export class MuscleGroupService {
  add(groups: readonly string[], group: string): string[] | null {
    const name = group.trim();
    return name.length > 0 && !groups.includes(name) ? [...groups, name] : null;
  }

  rename(groups: readonly string[], oldName: string, newName: string): string[] | null {
    const name = newName.trim();
    if (name.length === 0 || !groups.includes(oldName) || groups.includes(name)) return null;
    return groups.map((group) => group === oldName ? name : group);
  }

  renameExercise(exercise: Exercise, oldName: string, newName: string): Exercise | null {
    return exercise.muscleGroup === oldName ? { ...exercise, muscleGroup: newName.trim() } : null;
  }

  remove(groups: readonly string[], group: string): string[] {
    return groups.filter((item) => item !== group);
  }

  exerciseIds(exercises: readonly Exercise[], group: string): Set<string> {
    return new Set(
      exercises.filter((exercise) => exercise.muscleGroup === group).map((exercise) => exercise.id)
    );
  }
}

export const muscleGroupService = new MuscleGroupService();
