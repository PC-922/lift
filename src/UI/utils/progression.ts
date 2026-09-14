import { progressionService } from '../../domain/ProgressionService';
import type { LogFeedback } from '../../domain/ProgressionService';
import type { Exercise, ExerciseLog } from '../../domain';
import { getLanguage, translations } from './translations';

export type { LogFeedback } from '../../domain/ProgressionService';

export const getLogFeedback = (...args: Parameters<typeof progressionService.feedback>): LogFeedback | null => (
  progressionService.feedback(...args)
);

export const getLatestLog = (logs: ExerciseLog[]): ExerciseLog | null => (
  progressionService.latestLog(logs)
);

export const getLastProgressionDate = (logs: ExerciseLog[]): string | null => (
  progressionService.lastProgression(logs)?.date ?? null
);

export const getLastRegressionDate = (logs: ExerciseLog[]): string | null => (
  progressionService.lastRegression(logs)?.date ?? null
);

export type ProgressionType = 'weight' | 'reps' | 'both';

export interface ProgressionDetail {
  type: ProgressionType;
  date: string;
  timeSince: string;
  prevWeight: number;
  currWeight: number;
  prevReps: number;
  currReps: number;
}

export const getProgressionDetail = (logs: ExerciseLog[]): ProgressionDetail | null => {
  const detail = progressionService.lastProgression(logs);
  return detail ? { ...detail, timeSince: calculateTimeSince(detail.date) } : null;
};

export interface RecentProgression {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  lastProgressionDate: string;
  weight: number | null;
  reps: number | null;
  progressionText: string;
  detail: ProgressionDetail;
}

export const getRecentProgressions = (exercises: Exercise[], limit: number = 3): RecentProgression[] => {
  return exercises
    .map((exercise) => {
      const lastProgressionDate = getLastProgressionDate(exercise.logs);
      if (!lastProgressionDate) return null;

      const latestLog = getLatestLog(exercise.logs);
      if (!latestLog) return null;

      const progressionText = calculateProgression(exercise.logs);
      if (!progressionText) return null;

      const detail = getProgressionDetail(exercise.logs);
      if (!detail) return null;

      return {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        muscleGroup: exercise.muscleGroup,
        lastProgressionDate,
        weight: latestLog.weight,
        reps: latestLog.reps,
        progressionText,
        detail,
      };
    })
    .filter((item): item is RecentProgression => item !== null)
    .sort((a, b) => new Date(b.lastProgressionDate).getTime() - new Date(a.lastProgressionDate).getTime())
    .slice(0, limit);
};

export const calculateProgression = (logs: ExerciseLog[]): string | null => {
  const lastProgressionDate = getLastProgressionDate(logs);
  if (!lastProgressionDate) return null;

  return calculateTimeSince(lastProgressionDate);
};

export const getRegressionDetail = (logs: ExerciseLog[]): ProgressionDetail | null => {
  const detail = progressionService.lastRegression(logs);
  return detail ? { ...detail, timeSince: calculateTimeSince(detail.date) } : null;
};

export interface RecentRegression {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  lastRegressionDate: string;
  weight: number | null;
  reps: number | null;
  regressionText: string;
  detail: ProgressionDetail;
}

export const getRecentRegressions = (exercises: Exercise[], limit: number = 3): RecentRegression[] => {
  return exercises
    .map((exercise) => {
      const lastRegressionDate = getLastRegressionDate(exercise.logs);
      if (!lastRegressionDate) return null;

      const latestLog = getLatestLog(exercise.logs);
      if (!latestLog) return null;

      const regressionText = calculateRegression(exercise.logs);
      if (!regressionText) return null;

      const detail = getRegressionDetail(exercise.logs);
      if (!detail) return null;

      return {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        muscleGroup: exercise.muscleGroup,
        lastRegressionDate,
        weight: latestLog.weight,
        reps: latestLog.reps,
        regressionText,
        detail,
      };
    })
    .filter((item): item is RecentRegression => item !== null)
    .sort((a, b) => new Date(b.lastRegressionDate).getTime() - new Date(a.lastRegressionDate).getTime())
    .slice(0, limit);
};

export const calculateRegression = (logs: ExerciseLog[]): string | null => {
  const lastRegressionDate = getLastRegressionDate(logs);
  if (!lastRegressionDate) return null;

  return calculateTimeSince(lastRegressionDate);
};

const formatRelativeDays = (diffDays: number): string => {
  const t = translations[getLanguage()];
  if (diffDays <= 0) return t.time.today;
  if (diffDays === 1) return t.time.yesterday;
  if (diffDays < 7) return `${diffDays} ${t.time.days}`;

  const weeks = Math.floor(diffDays / 7);
  if (weeks < 4) {
    return `${weeks} ${weeks === 1 ? t.time.week : t.time.weeks}`;
  }

  const months = Math.max(1, Math.floor(diffDays / 30));
  if (months < 12) {
    return `${months} ${months === 1 ? t.time.month : t.time.months}`;
  }

  const years = Math.max(1, Math.floor(months / 12));
  return `${years} ${years === 1 ? t.time.year : t.time.years}`;
};

const getUtcStartOfDay = (date: string): Date => {
  return new Date(`${date}T00:00:00Z`);
};

const getTodayUtcStart = (): Date => {
  const today = new Date().toISOString().split('T')[0];
  return getUtcStartOfDay(today);
};

export const calculateTimeSince = (date: string): string => {
  const targetDate = getUtcStartOfDay(date);
  const today = getTodayUtcStart();
  const diffTime = today.getTime() - targetDate.getTime();
  const diffDays = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
  return formatRelativeDays(diffDays);
};
