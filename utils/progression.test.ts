import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getLastProgressionDate, calculateProgression, getLatestLog, getRecentProgressions, calculateTimeSince } from './progression';
import { ExerciseLog, Exercise } from '../types';
import { t } from './translations';

describe('progression utilities', () => {
  let today: Date;

  beforeEach(() => {
    today = new Date('2026-02-02');
    vi.useFakeTimers();
    vi.setSystemTime(today);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getLastProgressionDate', () => {
    it('should return null for empty logs', () => {
      expect(getLastProgressionDate([])).toBeNull();
    });

    it('should return null for a single log (no comparison possible)', () => {
      const logs: ExerciseLog[] = [{ date: '2026-02-01', weight: 50, reps: 10 }];
      expect(getLastProgressionDate(logs)).toBeNull();
    });

    it('should detect last increase in weight as progression', () => {
      const logs: ExerciseLog[] = [
        { date: '2026-01-30', weight: 50, reps: 10 },
        { date: '2026-01-31', weight: 50, reps: 10 },
        { date: '2026-02-01', weight: 55, reps: 10 },
      ];
      expect(getLastProgressionDate(logs)).toBe('2026-02-01');
    });

    it('should detect last increase in reps as progression', () => {
      const logs: ExerciseLog[] = [
        { date: '2026-01-30', weight: 50, reps: 10 },
        { date: '2026-01-31', weight: 50, reps: 10 },
        { date: '2026-02-01', weight: 50, reps: 12 },
      ];
      expect(getLastProgressionDate(logs)).toBe('2026-02-01');
    });

    it('should NOT count a decrease in weight as progression', () => {
      const logs: ExerciseLog[] = [
        { date: '2026-01-30', weight: 50, reps: 10 },
        { date: '2026-02-01', weight: 45, reps: 10 },
      ];
      expect(getLastProgressionDate(logs)).toBeNull();
    });

    it('should NOT count a decrease in reps as progression', () => {
      const logs: ExerciseLog[] = [
        { date: '2026-01-30', weight: 50, reps: 10 },
        { date: '2026-02-01', weight: 50, reps: 8 },
      ];
      expect(getLastProgressionDate(logs)).toBeNull();
    });

    it('should return null when same weight/reps logged multiple times', () => {
      const logs: ExerciseLog[] = [
        { date: '2026-02-01', weight: 50, reps: 10 },
        { date: '2026-02-02', weight: 50, reps: 10 },
      ];
      expect(getLastProgressionDate(logs)).toBeNull();
    });

    it('should handle unsorted logs and find the latest progression', () => {
      const logs: ExerciseLog[] = [
        { date: '2026-02-01', weight: 50, reps: 10 },
        { date: '2026-01-30', weight: 50, reps: 10 },
        { date: '2026-02-02', weight: 55, reps: 10 },
      ];
      expect(getLastProgressionDate(logs)).toBe('2026-02-02');
    });

    it('should return the most recent progression even if later logs regress', () => {
      const logs: ExerciseLog[] = [
        { date: '2026-01-28', weight: 50, reps: 10 },
        { date: '2026-01-30', weight: 55, reps: 10 }, // progreso
        { date: '2026-02-01', weight: 50, reps: 10 }, // bajada, no progreso
      ];
      // El progreso más reciente fue el 30 de enero
      expect(getLastProgressionDate(logs)).toBe('2026-01-30');
    });
  });

  describe('calculateProgression', () => {
    it('should return null for empty logs', () => {
      expect(calculateProgression([])).toBeNull();
    });

    it('should return null for a single log (no progression possible)', () => {
      const logs: ExerciseLog[] = [{ date: '2026-02-01', weight: 50, reps: 10 }];
      expect(calculateProgression(logs)).toBeNull();
    });

    it('should return null when there are only decreases', () => {
      const logs: ExerciseLog[] = [
        { date: '2026-01-30', weight: 60, reps: 10 },
        { date: '2026-02-01', weight: 50, reps: 10 },
      ];
      expect(calculateProgression(logs)).toBeNull();
    });

    it('should calculate days ago correctly', () => {
      const logs: ExerciseLog[] = [
        { date: '2026-01-29', weight: 45, reps: 10 },
        { date: '2026-01-30', weight: 50, reps: 10 },
      ];
      const result = calculateProgression(logs);
      expect(result).toBe(`3 ${t.time.days}`);
    });

    it('should calculate months correctly after four weeks', () => {
      const logs: ExerciseLog[] = [
        { date: '2025-12-30', weight: 45, reps: 10 },
        { date: '2026-01-02', weight: 50, reps: 10 },
      ];
      const result = calculateProgression(logs);
      expect(result).toBe(`1 ${t.time.month}`);
    });

    it('should calculate months correctly', () => {
      const logs: ExerciseLog[] = [
        { date: '2025-09-30', weight: 45, reps: 10 },
        { date: '2025-10-02', weight: 50, reps: 10 },
      ];
      const result = calculateProgression(logs);
      expect(result).toBe(`4 ${t.time.months}`);
    });

    it('should use yesterday for 1 day', () => {
      const logs: ExerciseLog[] = [
        { date: '2026-01-31', weight: 45, reps: 10 },
        { date: '2026-02-01', weight: 50, reps: 10 },
      ];
      const result = calculateProgression(logs);
      expect(result).toBe(t.time.yesterday);
    });

    it('should return today for same-day progression', () => {
      const logs: ExerciseLog[] = [
        { date: '2026-02-01', weight: 45, reps: 10 },
        { date: '2026-02-02', weight: 50, reps: 10 },
      ];
      expect(calculateProgression(logs)).toBe(t.time.today);
    });
  });

  describe('getRecentProgressions', () => {
    it('should return empty array for no exercises', () => {
      expect(getRecentProgressions([])).toEqual([]);
    });

    it('should return empty array when exercises have no logs', () => {
      const exercises: Exercise[] = [
        { id: '1', name: 'Bench', muscleGroup: 'Pecho', logs: [] },
        { id: '2', name: 'Squat', muscleGroup: 'Pierna', logs: [] },
      ];
      expect(getRecentProgressions(exercises)).toEqual([]);
    });

    it('should exclude exercises with only decreases or flat logs', () => {
      const exercises: Exercise[] = [
        {
          id: '1',
          name: 'Bench',
          muscleGroup: 'Pecho',
          logs: [
            { date: '2026-01-30', weight: 60, reps: 10 },
            { date: '2026-02-01', weight: 50, reps: 10 },
          ],
        },
      ];
      expect(getRecentProgressions(exercises)).toEqual([]);
    });

    it('should sort by most recent progression first', () => {
      const exercises: Exercise[] = [
        {
          id: '1',
          name: 'Bench',
          muscleGroup: 'Pecho',
          logs: [
            { date: '2026-01-15', weight: 50, reps: 10 },
            { date: '2026-02-01', weight: 55, reps: 10 },
          ],
        },
        {
          id: '2',
          name: 'Squat',
          muscleGroup: 'Pierna',
          logs: [
            { date: '2026-01-30', weight: 100, reps: 8 },
            { date: '2026-01-31', weight: 105, reps: 8 },
          ],
        },
      ];
      const result = getRecentProgressions(exercises);
      expect(result[0].exerciseName).toBe('Bench');
      expect(result[1].exerciseName).toBe('Squat');
    });

    it('should limit results to specified number', () => {
      const exercises: Exercise[] = [
        { id: '1', name: 'Ex1', muscleGroup: 'G1', logs: [{ date: '2026-02-01', weight: 45, reps: 10 }, { date: '2026-02-02', weight: 50, reps: 10 }] },
        { id: '2', name: 'Ex2', muscleGroup: 'G2', logs: [{ date: '2026-01-31', weight: 45, reps: 10 }, { date: '2026-02-02', weight: 50, reps: 10 }] },
        { id: '3', name: 'Ex3', muscleGroup: 'G3', logs: [{ date: '2026-01-30', weight: 45, reps: 10 }, { date: '2026-02-02', weight: 50, reps: 10 }] },
        { id: '4', name: 'Ex4', muscleGroup: 'G4', logs: [{ date: '2026-01-29', weight: 45, reps: 10 }, { date: '2026-02-02', weight: 50, reps: 10 }] },
      ];
      const result = getRecentProgressions(exercises, 2);
      expect(result).toHaveLength(2);
    });

    it('should include correct progression data', () => {
      const exercises: Exercise[] = [
        {
          id: '1',
          name: 'Bench Press',
          muscleGroup: 'Pecho',
          logs: [
            { date: '2026-01-31', weight: 45, reps: 10 },
            { date: '2026-02-01', weight: 50, reps: 10 },
          ],
        },
      ];
      const result = getRecentProgressions(exercises);
      expect(result[0]).toEqual({
        exerciseId: '1',
        exerciseName: 'Bench Press',
        muscleGroup: 'Pecho',
        lastProgressionDate: '2026-02-01',
        weight: 50,
        reps: 10,
        progressionText: t.time.yesterday,
        detail: {
          type: 'weight',
          timeSince: t.time.yesterday,
          prevWeight: 45,
          currWeight: 50,
          prevReps: 10,
          currReps: 10,
        },
      });
    });
  });

  describe('getLatestLog', () => {
    it('should return null for empty logs', () => {
      expect(getLatestLog([])).toBeNull();
    });

    it('should return the only log', () => {
      const logs: ExerciseLog[] = [{ date: '2026-02-01', weight: 50, reps: 10 }];
      expect(getLatestLog(logs)).toEqual({ date: '2026-02-01', weight: 50, reps: 10 });
    });

    it('should return the last log', () => {
      const logs: ExerciseLog[] = [
        { date: '2023-10-27', weight: 60, reps: 10 },
        { date: '2026-01-07', weight: 100, reps: 8 },
        { date: '2026-02-04', weight: 80, reps: 8 },
      ];
      const result = getLatestLog(logs);
      expect(result).not.toBeNull();
      expect(result?.weight).toBe(80);
      expect(result?.date).toBe('2026-02-04');
    });
  });

  describe('calculateTimeSince', () => {
    it('should calculate today correctly', () => {
      expect(calculateTimeSince('2026-02-02')).toBe(t.time.today);
    });
  });
});
