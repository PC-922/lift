import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getTopWeightExercises } from './insights';
import { Exercise } from '../../domain';

describe('insights utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-02'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should order top weight exercises by latest weight', () => {
    const exercises: Exercise[] = [
      {
        id: '1',
        name: 'Bench',
        muscleGroup: 'Pecho',
        logs: [
          { date: '2026-01-01', weight: 120, reps: 6 },
          { date: '2026-02-01', weight: 80, reps: 8 },
        ],
      },
      {
        id: '2',
        name: 'Squat',
        muscleGroup: 'Pierna',
        logs: [{ date: '2026-02-01', weight: 90, reps: 5 }],
      },
    ];

    const result = getTopWeightExercises(exercises, 2);
    expect(result).toHaveLength(2);
    expect(result[0].exerciseId).toBe('2');
    expect(result[0].weight).toBe(90);
    expect(result[1].exerciseId).toBe('1');
    expect(result[1].weight).toBe(80);
  });

  
});
