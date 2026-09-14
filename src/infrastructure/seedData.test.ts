import { describe, it, expect } from 'vitest';
import { getDefaultMuscleGroups, getDefaultExercises, DEFAULT_MUSCLE_GROUPS } from './seedData';

describe('seedData', () => {
  it('returns a copy of the default muscle groups', () => {
    const groups = getDefaultMuscleGroups();
    expect(groups).toEqual(DEFAULT_MUSCLE_GROUPS);
    groups.pop();
    expect(getDefaultMuscleGroups()).toHaveLength(DEFAULT_MUSCLE_GROUPS.length);
  });

  it('returns exercises for every default muscle group', () => {
    const exercises = getDefaultExercises();
    expect(exercises.length).toBeGreaterThan(0);
    exercises.forEach((exercise) => {
      expect(DEFAULT_MUSCLE_GROUPS).toContain(exercise.muscleGroup);
    });
  });
});
