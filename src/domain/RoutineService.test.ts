import { describe, expect, it } from 'vitest';
import type { Routine } from './Routine';
import { routineService } from './RoutineService';

const routines: Routine[] = [
  { id: 'a', name: 'A', order: 0, days: [] },
  { id: 'b', name: 'B', order: 1, days: [] },
];

describe('RoutineService', () => {
  it('reorders routines without mutating their previous order', () => {
    expect(routineService.reorder(routines, 0, 1)).toEqual([
      { ...routines[1], order: 0 },
      { ...routines[0], order: 1 },
    ]);
    expect(routines.map((routine) => routine.id)).toEqual(['a', 'b']);
  });

  it('rejects invalid positions', () => {
    expect(routineService.reorder(routines, -1, 1)).toBeNull();
    expect(routineService.reorder(routines, 0, 2)).toBeNull();
  });
});
