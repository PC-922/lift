import { describe, expect, it } from 'vitest';
import { ExerciseLogs } from './ExerciseLogs';

const first = { date: '2026-09-07', weight: 40, reps: 10 };
const second = { date: '2026-09-08', weight: 50, reps: 8 };

describe('exercise logs', () => {
  it('keeps one log per day without mutating the previous logs', () => {
    const logs = Object.freeze([first, second]);
    const updated = { ...second, weight: 60 };
    expect(ExerciseLogs.from(logs).record(updated).values()).toEqual([first, updated]);
    expect(logs).toEqual([first, second]);
    expect(ExerciseLogs.from([]).record(first).values()).toEqual([first]);
  });

  it('merges a date collision when editing and ignores a missing original date', () => {
    const updated = { ...second, reps: 12 };
    expect(ExerciseLogs.from([first, second]).replace(first.date, updated)?.values()).toEqual([updated]);
    expect(ExerciseLogs.from([second, first]).replace(first.date, updated)?.values()).toEqual([updated]);
    expect(ExerciseLogs.from([first]).replace(second.date, updated)).toBeNull();
  });

  it('retains only the latest log regardless of input order', () => {
    expect(ExerciseLogs.from([second, first]).latest().values()).toEqual([second]);
    expect(ExerciseLogs.from([]).latest().values()).toEqual([]);
  });
});
