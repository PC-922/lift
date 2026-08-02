import { describe, it, expect, vi, beforeEach } from 'vitest';
import { migrateLegacyDataIfNeeded } from './legacyMigration';
import { DataStore } from './dataStore';

const createMockDataStore = (hasData = false): DataStore => ({
  uid: 'test-user',
  subscribe: vi.fn(() => vi.fn()),
  hasData: vi.fn(() => Promise.resolve(hasData)),
  saveExercise: vi.fn(() => Promise.resolve()),
  deleteExercise: vi.fn(() => Promise.resolve()),
  saveRoutine: vi.fn(() => Promise.resolve()),
  deleteRoutine: vi.fn(() => Promise.resolve()),
  saveMuscleGroups: vi.fn(() => Promise.resolve()),
  saveGroupSortPreference: vi.fn(() => Promise.resolve()),
  resetData: vi.fn(() => Promise.resolve()),
});

describe('migrateLegacyDataIfNeeded', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) => store[key] ?? null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: vi.fn((key: string) => { delete store[key]; }),
      },
    });
  });

  it('does nothing when the migration flag is already set', async () => {
    window.localStorage.setItem('lift_migrated_v2', 'true');
    const dataStore = createMockDataStore(false);

    await migrateLegacyDataIfNeeded(dataStore);

    expect(dataStore.hasData).not.toHaveBeenCalled();
    expect(dataStore.saveExercise).not.toHaveBeenCalled();
  });

  it('sets the flag and does nothing when Firestore already has data', async () => {
    const dataStore = createMockDataStore(true);

    await migrateLegacyDataIfNeeded(dataStore);

    expect(window.localStorage.setItem).toHaveBeenCalledWith('lift_migrated_v2', 'true');
    expect(dataStore.saveExercise).not.toHaveBeenCalled();
  });

  it('seeds defaults when there is no legacy data and Firestore is empty', async () => {
    const dataStore = createMockDataStore(false);

    await migrateLegacyDataIfNeeded(dataStore);

    expect(dataStore.saveMuscleGroups).toHaveBeenCalled();
    expect(dataStore.saveExercise).toHaveBeenCalled();
    expect(window.localStorage.setItem).toHaveBeenCalledWith('lift_migrated_v2', 'true');
  });

  it('migrates legacy exercises and routines to Firestore', async () => {
    const dataStore = createMockDataStore(false);
    const exercise = {
      id: 'exercise_1',
      name: 'Bench Press',
      muscleGroup: 'Chest',
      logs: [{ date: '2026-01-01', weight: 80, reps: 8 }],
    };
    const routine = {
      id: 'routine_1',
      name: 'Upper Body',
      days: [
        {
          id: 'day_1',
          name: 'Day A',
          exercises: [{ exerciseId: 'exercise_1', sets: 3, reps: '8', dropset: false, toFailure: false }],
        },
      ],
    };
    window.localStorage.setItem('lift_data_v1', JSON.stringify([exercise]));
    window.localStorage.setItem('lift_routines_v1', JSON.stringify([routine]));
    window.localStorage.setItem('lift_groups_v1', JSON.stringify(['Chest']));

    await migrateLegacyDataIfNeeded(dataStore);

    expect(dataStore.saveExercise).toHaveBeenCalled();
    expect(dataStore.saveRoutine).toHaveBeenCalled();
    expect(dataStore.saveMuscleGroups).toHaveBeenCalledWith(['Chest']);
    expect(window.localStorage.setItem).toHaveBeenCalledWith('lift_migrated_v2', 'true');
  });
});
