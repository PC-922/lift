import type { Clock } from '../domain/Clock';

export const systemClock: Clock = {
  now: () => new Date().toISOString(),
  today: () => new Date().toISOString().split('T')[0],
};
