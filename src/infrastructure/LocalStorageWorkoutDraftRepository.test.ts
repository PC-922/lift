import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { localStorageWorkoutDraftRepository } from './LocalStorageWorkoutDraftRepository';
import type { ActiveWorkout } from '../domain/ActiveWorkout';

const draft: ActiveWorkout = { id: 'w', name: 'Push', startedAt: '2026-09-08', exercises: [] };

describe('LocalStorage workout draft adapter', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

  it('persists, restores and removes a draft', () => {
    localStorageWorkoutDraftRepository.save(draft);
    expect(localStorageWorkoutDraftRepository.load()).toEqual(draft);
    localStorageWorkoutDraftRepository.save(null);
    expect(localStorageWorkoutDraftRepository.load()).toBeNull();
  });

  it('ignores corrupted JSON and invalid draft shapes', () => {
    for (const value of ['{bad', 'null', '{}', '{"id":"w","exercises":42}']) {
      localStorage.setItem('lift_active_workout_v1', value);
      expect(localStorageWorkoutDraftRepository.load()).toBeNull();
    }
  });

  it('continues in memory when LocalStorage is inaccessible or full', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(localStorageWorkoutDraftRepository.load()).toBeNull();
    expect(() => localStorageWorkoutDraftRepository.save(draft)).not.toThrow();
  });
});
