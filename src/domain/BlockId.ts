import type { ActiveWorkout } from './ActiveWorkout';
import type { Routine } from './Routine';
import type { Workout } from './Workout';

export function newBlockId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `block_${crypto.randomUUID()}`;
  }
  return `block_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

function normalizeBlocks<T extends { blockId?: string }>(items: T[], scope: string): (T & { blockId: string })[] {
  const used = new Set<string>();
  return items.map((item, index) => {
    const existing = typeof item.blockId === 'string' ? item.blockId.trim() : '';
    const base = existing && !used.has(existing) ? existing : `legacy_block_${scope}_${index}`;
    let blockId = base;
    let suffix = 1;
    while (used.has(blockId)) blockId = `${base}_${suffix++}`;
    used.add(blockId);
    return { ...item, blockId };
  });
}

export function normalizeRoutineBlocks(routine: Routine): Routine {
  return {
    ...routine,
    days: routine.days.map((day) => ({
      ...day,
      exercises: normalizeBlocks(day.exercises, `${encodeURIComponent(routine.id)}_${encodeURIComponent(day.id)}`),
    })),
  };
}

export function normalizeWorkoutBlocks(workout: Workout): Workout {
  return {
    ...workout,
    entries: normalizeBlocks(workout.entries, encodeURIComponent(workout.id)),
  };
}

export function normalizeActiveWorkoutBlocks(workout: ActiveWorkout): ActiveWorkout {
  return {
    ...workout,
    exercises: normalizeBlocks(workout.exercises, encodeURIComponent(workout.id)),
  };
}
