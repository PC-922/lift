import type { ActiveWorkout } from '../domain/ActiveWorkout';
import type { WorkoutDraftRepository } from '../domain/WorkoutDraftRepository';
import { normalizeActiveWorkoutBlocks } from '../domain/BlockId';

const ACTIVE_WORKOUT_KEY = 'lift_active_workout_v1';

function loadDraft(): ActiveWorkout | null {
  try {
    const raw = localStorage.getItem(ACTIVE_WORKOUT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveWorkout;
    if (!parsed.id || !Array.isArray(parsed.exercises)) return null;
    return normalizeActiveWorkoutBlocks(parsed);
  } catch {
    return null;
  }
}

export const localStorageWorkoutDraftRepository: WorkoutDraftRepository = {
  load: loadDraft,
  save(draft) {
    try {
      if (draft) localStorage.setItem(ACTIVE_WORKOUT_KEY, JSON.stringify(draft));
      else localStorage.removeItem(ACTIVE_WORKOUT_KEY);
    } catch {
      // A storage failure must not prevent the in-memory workout from continuing.
    }
  },
};
