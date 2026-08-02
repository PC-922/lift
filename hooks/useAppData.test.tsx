import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppDataProvider, useAppData } from './useAppData';
import { DataStore, DataStoreSnapshot, DataStoreStatus } from '../services/storage/dataStore';
import { Exercise, GroupSortPreference, Routine } from '../types';
import { createSharedRoutine, serializeSharedRoutine } from '../services/routineShareService';

const createMockDataStore = (initial: Partial<DataStoreSnapshot> = {}): DataStore => {
  let snapshot: DataStoreSnapshot = {
    exercises: [],
    routines: [],
    muscleGroups: [],
    groupSortPreference: { field: 'progress', direction: 'desc' },
    ...initial,
  };

  let onData: ((snapshot: DataStoreSnapshot) => void) | null = null;

  return {
    uid: 'test-user',
    subscribe(callback, onStatus) {
      onData = callback;
      callback(snapshot);
      onStatus({ hasPendingWrites: false, fromCache: false });
      return () => {
        onData = null;
      };
    },
    hasData: vi.fn(() => Promise.resolve(false)),
    saveExercise: vi.fn(async (exercise: Exercise) => {
      snapshot = { ...snapshot, exercises: [...snapshot.exercises, exercise] };
      onData?.(snapshot);
    }),
    deleteExercise: vi.fn(() => Promise.resolve()),
    saveRoutine: vi.fn(async (routine: Routine) => {
      snapshot = { ...snapshot, routines: [...snapshot.routines, routine] };
      onData?.(snapshot);
    }),
    deleteRoutine: vi.fn(() => Promise.resolve()),
    saveMuscleGroups: vi.fn(async (groups: string[]) => {
      snapshot = { ...snapshot, muscleGroups: groups };
      onData?.(snapshot);
    }),
    saveGroupSortPreference: vi.fn(async (preference: GroupSortPreference) => {
      snapshot = { ...snapshot, groupSortPreference: preference };
      onData?.(snapshot);
    }),
    resetData: vi.fn(() => Promise.resolve()),
  };
};

vi.mock('./useAuth', () => ({
  useAuth: () => ({ user: { uid: 'test-user' } }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../services/storageService', async () => {
  return {
    makeId: (prefix: string) => `${prefix}_id`,
    createDataStore: vi.fn((_uid: string) => createMockDataStore()),
  };
});

vi.mock('../services/storage/legacyMigration', () => ({
  migrateLegacyDataIfNeeded: vi.fn(() => Promise.resolve()),
}));

vi.mock('../services/exportImport', () => ({
  exportData: vi.fn(() => '{}'),
  importData: vi.fn(() => ({ exercises: [], routines: [], muscleGroups: [], sortPreference: { field: 'progress', direction: 'desc' } })),
}));

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppDataProvider>{children}</AppDataProvider>
);

describe('useAppData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides loading state initially and finishes after subscription', async () => {
    const { result } = renderHook(() => useAppData(), { wrapper });
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('exposes data from the data store', async () => {
    const exercise: Exercise = {
      id: 'ex_1',
      name: 'Bench Press',
      muscleGroup: 'Chest',
      logs: [],
    };
    const routine: Routine = {
      id: 'routine_1',
      name: 'Upper Body',
      days: [],
    };

    const dataStore = createMockDataStore({
      exercises: [exercise],
      routines: [routine],
      muscleGroups: ['Chest'],
      groupSortPreference: { field: 'weight', direction: 'asc' },
    });

    const { createDataStore } = await import('../services/storageService');
    vi.mocked(createDataStore).mockReturnValue(dataStore);

    const { result } = renderHook(() => useAppData(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.exercises).toEqual([exercise]);
    expect(result.current.routines).toEqual([routine]);
    expect(result.current.muscleGroups).toEqual(['Chest']);
    expect(result.current.groupSortPreference).toEqual({ field: 'weight', direction: 'asc' });
  });

  it('saves an exercise through the data store', async () => {
    const dataStore = createMockDataStore();
    const { createDataStore } = await import('../services/storageService');
    vi.mocked(createDataStore).mockReturnValue(dataStore);

    const { result } = renderHook(() => useAppData(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const exercise: Exercise = {
      id: 'ex_1',
      name: 'Squat',
      muscleGroup: 'Legs',
      logs: [],
    };

    await act(async () => {
      await result.current.saveExercise(exercise);
    });

    expect(dataStore.saveExercise).toHaveBeenCalledWith(expect.objectContaining({ id: 'ex_1', name: 'Squat' }));
  });

  it('deletes an exercise through the data store', async () => {
    const dataStore = createMockDataStore();
    const { createDataStore } = await import('../services/storageService');
    vi.mocked(createDataStore).mockReturnValue(dataStore);

    const { result } = renderHook(() => useAppData(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.deleteExercise('ex_1');
    });

    expect(dataStore.deleteExercise).toHaveBeenCalledWith('ex_1');
  });

  it('adds a muscle group through the data store', async () => {
    const dataStore = createMockDataStore({ muscleGroups: ['Chest'] });
    const { createDataStore } = await import('../services/storageService');
    vi.mocked(createDataStore).mockReturnValue(dataStore);

    const { result } = renderHook(() => useAppData(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addMuscleGroup('Back');
    });

    expect(dataStore.saveMuscleGroups).toHaveBeenCalledWith(['Chest', 'Back']);
  });

  it('does not add duplicate muscle groups', async () => {
    const dataStore = createMockDataStore({ muscleGroups: ['Chest'] });
    const { createDataStore } = await import('../services/storageService');
    vi.mocked(createDataStore).mockReturnValue(dataStore);

    const { result } = renderHook(() => useAppData(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addMuscleGroup('Chest');
    });

    expect(dataStore.saveMuscleGroups).not.toHaveBeenCalled();
  });

  it('saves a routine with an order', async () => {
    const dataStore = createMockDataStore();
    const { createDataStore } = await import('../services/storageService');
    vi.mocked(createDataStore).mockReturnValue(dataStore);

    const { result } = renderHook(() => useAppData(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const routine: Routine = {
      id: 'routine_1',
      name: 'Pull Day',
      days: [],
    };

    await act(async () => {
      await result.current.saveRoutine(routine);
    });

    expect(dataStore.saveRoutine).toHaveBeenCalledWith(expect.objectContaining({ id: 'routine_1', order: 0 }));
  });

  it('exports data using the current snapshot', async () => {
    const exercise: Exercise = {
      id: 'ex_1',
      name: 'Deadlift',
      muscleGroup: 'Back',
      logs: [],
    };
    const dataStore = createMockDataStore({ exercises: [exercise] });
    const { createDataStore } = await import('../services/storageService');
    vi.mocked(createDataStore).mockReturnValue(dataStore);

    const { exportData: exportBackup } = await import('../services/exportImport');

    const { result } = renderHook(() => useAppData(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.exportData();
    });

    expect(exportBackup).toHaveBeenCalledWith(
      expect.objectContaining({
        exercises: [exercise],
        muscleGroups: [],
        routines: [],
      })
    );
  });

  it('imports a shared routine and creates missing exercises', async () => {
    const dataStore = createMockDataStore();
    const { createDataStore } = await import('../services/storageService');
    vi.mocked(createDataStore).mockReturnValue(dataStore);

    const routine: Routine = {
      id: 'routine_1',
      name: 'Leg Day',
      days: [
        {
          id: 'day_1',
          name: 'Day A',
          exercises: [
            { exerciseId: 'ex_squat', sets: 4, reps: '5', dropset: false, toFailure: false },
          ],
        },
      ],
    };
    const existingExercises: Exercise[] = [
      { id: 'ex_squat', name: 'Squat', muscleGroup: 'Legs', logs: [] },
    ];

    const shared = createSharedRoutine(routine, existingExercises);
    const json = serializeSharedRoutine(shared);

    const { result } = renderHook(() => useAppData(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.importRoutine(json);
    });

    expect(dataStore.saveExercise).toHaveBeenCalled();
    expect(dataStore.saveRoutine).toHaveBeenCalled();
    const savedRoutine = vi.mocked(dataStore.saveRoutine).mock.calls[0][0] as Routine;
    expect(savedRoutine.name).toBe('Leg Day');
  });
});
