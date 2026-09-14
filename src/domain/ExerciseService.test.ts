import { describe, expect, it } from 'vitest';
import { exerciseService } from './ExerciseService';

const exercise = { id: 'press', name: 'Press', muscleGroup: 'Chest', logs: [] };

describe('ExerciseService', () => {
  it('normalizes details and optional notes', () => {
    expect(exerciseService.updateDetails(exercise, ' Bench press ', ' Chest ')).toEqual({
      ...exercise,
      name: 'Bench press',
      muscleGroup: 'Chest',
    });
    expect(exerciseService.updateNote(exercise, '  Slow descent  ').note).toBe('Slow descent');
    expect(exerciseService.updateNote({ ...exercise, note: 'Old' }, ' ').note).toBeUndefined();
  });

  it('rejects empty names and groups', () => {
    expect(exerciseService.updateDetails(exercise, '', 'Chest')).toBeNull();
    expect(exerciseService.updateDetails(exercise, 'Press', ' ')).toBeNull();
  });
});
