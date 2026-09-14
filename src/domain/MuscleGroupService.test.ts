import { describe, expect, it } from 'vitest';
import { muscleGroupService } from './MuscleGroupService';

describe('MuscleGroupService', () => {
  it('adds and renames normalized group names', () => {
    expect(muscleGroupService.add(['Chest'], ' Back ')).toEqual(['Chest', 'Back']);
    expect(muscleGroupService.rename(['Chest', 'Back'], 'Back', ' Upper back '))
      .toEqual(['Chest', 'Upper back']);
  });

  it('rejects empty and duplicate names', () => {
    expect(muscleGroupService.add(['Chest'], 'Chest')).toBeNull();
    expect(muscleGroupService.rename(['Chest', 'Back'], 'Back', 'Chest')).toBeNull();
    expect(muscleGroupService.rename(['Chest'], 'Chest', ' ')).toBeNull();
  });
});
