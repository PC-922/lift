import { ExerciseLog } from '../types';
import { Exercise } from '../types';
import { getLanguage, translations } from './translations';

export type LogFeedback =
  | { type: 'first' }
  | { type: 'progress'; kind: 'weight' | 'reps' | 'both' }
  | { type: 'regression'; kind: 'weight' | 'reps' | 'both' };

export const getLogFeedback = (
  weight: number | null,
  reps: number | null,
  prevWeight: number | null,
  prevReps: number | null,
  isFirst: boolean
): LogFeedback | null => {
  if (isFirst) return { type: 'first' };
  if (weight === null || prevWeight === null) return null;

  const weightUp = weight > prevWeight;
  const weightDown = weight < prevWeight;
  const weightEqual = weight === prevWeight;
  const repsUp = reps !== null && prevReps !== null && reps > prevReps;
  const repsDown = reps !== null && prevReps !== null && reps < prevReps;

  if (weightUp) return { type: 'progress', kind: repsUp ? 'both' : 'weight' };
  if (weightDown) return { type: 'regression', kind: repsDown ? 'both' : 'weight' };
  if (weightEqual && repsUp) return { type: 'progress', kind: 'reps' };
  if (weightEqual && repsDown) return { type: 'regression', kind: 'reps' };
  return null;
};

export const getLastProgressionDate = (logs: ExerciseLog[]): string | null => {
  if (!logs || logs.length < 2) return null;

  const sortedLogs = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  for (let i = sortedLogs.length - 1; i > 0; i--) {
    const current = sortedLogs[i];
    const previous = sortedLogs[i - 1];

    const weightUp = current.weight !== null && previous.weight !== null && current.weight > previous.weight;
    const repsUp = current.reps !== null && previous.reps !== null && current.reps > previous.reps;
    const weightEqual = current.weight !== null && previous.weight !== null && current.weight === previous.weight;

    // New Rules:
    // 1. Weight UP (irrespective of reps)
    // 2. Weight SAME and Reps UP
    if (weightUp || (weightEqual && repsUp)) {
      return current.date;
    }
  }

  return null;
};

export type ProgressionType = 'weight' | 'reps' | 'both';

export interface ProgressionDetail {
  type: ProgressionType;
  timeSince: string;
  prevWeight: number;
  currWeight: number;
  prevReps: number;
  currReps: number;
}

export const getProgressionDetail = (logs: ExerciseLog[]): ProgressionDetail | null => {
  if (!logs || logs.length < 2) return null;

  const sortedLogs = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  for (let i = sortedLogs.length - 1; i > 0; i--) {
    const current = sortedLogs[i];
    const previous = sortedLogs[i - 1];

    const weightUp = current.weight !== null && previous.weight !== null && current.weight > previous.weight;
    const repsUp = current.reps !== null && previous.reps !== null && current.reps > previous.reps;
    const weightEqual = current.weight !== null && previous.weight !== null && current.weight === previous.weight;

    if (weightUp || (weightEqual && repsUp)) {
      let type: ProgressionType = 'weight';
      if (weightUp && repsUp) {
        type = 'both';
      } else if (weightEqual && repsUp) {
        type = 'reps';
      }

      return {
        type,
        timeSince: calculateTimeSince(current.date),
        prevWeight: previous.weight ?? 0,
        currWeight: current.weight ?? 0,
        prevReps: previous.reps ?? 0,
        currReps: current.reps ?? 0,
      };
    }
  }

  return null;
};

export const getLatestLog = (logs: ExerciseLog[]): ExerciseLog | null => {
  if (!logs || logs.length === 0) return null;
  const sortedLogs = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return sortedLogs[0];
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

export const getLastRegressionDate = (logs: ExerciseLog[]): string | null => {
  if (!logs || logs.length < 2) return null;

  const sortedLogs = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  for (let i = sortedLogs.length - 1; i > 0; i--) {
    const current = sortedLogs[i];
    const previous = sortedLogs[i - 1];

    const weightDown = current.weight !== null && previous.weight !== null && current.weight < previous.weight;
    const repsDown = current.reps !== null && previous.reps !== null && current.reps < previous.reps;
    const weightEqual = current.weight !== null && previous.weight !== null && current.weight === previous.weight;

    if (weightDown || (weightEqual && repsDown)) {
      return current.date;
    }
  }

  return null;
};

export const getRegressionDetail = (logs: ExerciseLog[]): ProgressionDetail | null => {
  if (!logs || logs.length < 2) return null;

  const sortedLogs = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  for (let i = sortedLogs.length - 1; i > 0; i--) {
    const current = sortedLogs[i];
    const previous = sortedLogs[i - 1];

    const weightDown = current.weight !== null && previous.weight !== null && current.weight < previous.weight;
    const repsDown = current.reps !== null && previous.reps !== null && current.reps < previous.reps;
    const weightEqual = current.weight !== null && previous.weight !== null && current.weight === previous.weight;

    if (weightDown || (weightEqual && repsDown)) {
      let type: ProgressionType = 'weight';
      if (weightDown && repsDown) {
        type = 'both';
      } else if (weightEqual && repsDown) {
        type = 'reps';
      }

      return {
        type,
        timeSince: calculateTimeSince(current.date),
        prevWeight: previous.weight ?? 0,
        currWeight: current.weight ?? 0,
        prevReps: previous.reps ?? 0,
        currReps: current.reps ?? 0,
      };
    }
  }

  return null;
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
