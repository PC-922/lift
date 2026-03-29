import { ExerciseLog } from '../types';
import { Exercise } from '../types';
import { t } from './translations';

export const getLastProgressionDate = (logs: ExerciseLog[]): string | null => {
  if (!logs || logs.length < 2) return null;

  const sortedLogs = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  for (let i = sortedLogs.length - 1; i > 0; i--) {
    const current = sortedLogs[i];
    const previous = sortedLogs[i - 1];

    // Only upward changes in weight or reps count as progression — decreases are ignored.
    if (current.weight > previous.weight || current.reps > previous.reps) {
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

    const weightUp = current.weight > previous.weight;
    const repsUp = current.reps > previous.reps;

    if (weightUp || repsUp) {
      const type: ProgressionType = weightUp && repsUp ? 'both' : weightUp ? 'weight' : 'reps';
      return {
        type,
        timeSince: calculateTimeSince(current.date),
        prevWeight: previous.weight,
        currWeight: current.weight,
        prevReps: previous.reps,
        currReps: current.reps,
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
  weight: number;
  reps: number;
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

const formatRelativeDays = (diffDays: number): string => {
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
