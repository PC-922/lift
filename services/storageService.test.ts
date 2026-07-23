import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { storageManager, setStorageUser } from './storageService';
import { Exercise, Routine } from '../types';

const mockStorage: Record<string, string> = {};

const mockLocalStorageTarget: Record<string, unknown> = {};

const defineMockMethod = (name: string, fn: (...args: unknown[]) => unknown) => {
  Object.defineProperty(mockLocalStorageTarget, name, {
    value: vi.fn(fn),
    enumerable: false,
    configurable: true,
  });
};

defineMockMethod('getItem', (key: string) => mockStorage[key] ?? null);
defineMockMethod('setItem', (key: string, value: string) => { mockStorage[key] = value; });
defineMockMethod('removeItem', (key: string) => { delete mockStorage[key]; });
defineMockMethod('clear', () => { Object.keys(mockStorage).forEach((key) => delete mockStorage[key]); });
defineMockMethod('key', (index: number) => Object.keys(mockStorage)[index] ?? null);

vi.stubGlobal(
  'localStorage',
  new Proxy(mockLocalStorageTarget, {
    get(_target, prop) {
      if (prop === 'length') return Object.keys(mockStorage).length;
      if (typeof prop === 'string' && prop in mockStorage) return mockStorage[prop];
      return Reflect.get(mockLocalStorageTarget, prop);
    },
    set(_target, prop, value) {
      if (typeof prop === 'string') {
        mockStorage[prop] = value;
        return true;
      }
      return Reflect.set(mockLocalStorageTarget, prop, value);
    },
    deleteProperty(_target, prop) {
      if (typeof prop === 'string') {
        delete mockStorage[prop];
        return true;
      }
      return Reflect.deleteProperty(mockLocalStorageTarget, prop);
    },
    ownKeys() {
      return Object.keys(mockStorage);
    },
    getOwnPropertyDescriptor(_target, prop) {
      if (typeof prop === 'string' && prop in mockStorage) {
        return { enumerable: true, configurable: true, value: mockStorage[prop] };
      }
      return Reflect.getOwnPropertyDescriptor(mockLocalStorageTarget, prop);
    },
    has(_target, prop) {
      if (typeof prop === 'string' && prop in mockStorage) return true;
      return Reflect.has(mockLocalStorageTarget, prop);
    },
  })
);

const seedExercise = (id: string, group: string = 'Pecho'): Exercise => ({
  id,
  name: id,
  muscleGroup: group,
  logs: [],
});

const makeDay = (id: string, exercises: Routine['days'][number]['exercises'] = []): Routine['days'][number] => ({
  id,
  name: 'Día 1',
  exercises,
});

// storageService uses localStorage — jsdom provides it in the test env.

describe('storageService — routines', () => {
  beforeEach(() => {
    localStorage.clear();
    setStorageUser(null, 'guest');
  });

  afterEach(() => {
    localStorage.clear();
  });

  // --- getRoutines ---

  it('returns an empty array when no routines are stored', async () => {
    expect(await storageManager.getRoutines()).toEqual([]);
  });

  // --- saveRoutine ---

  it('saves a new routine and retrieves it', async () => {
    await storageManager.saveExercise(seedExercise('ex1'));
    const routine: Routine = {
      id: 'r1',
      name: 'Push Day',
      days: [makeDay('d1', [{ exerciseId: 'ex1', sets: 3, reps: '10', dropset: false, toFailure: false }])],
    };
    await storageManager.saveRoutine(routine);
    const routines = await storageManager.getRoutines();
    expect(routines).toHaveLength(1);
    expect(routines[0]).toEqual(routine);
  });

  it('saves multiple routines independently', async () => {
    await storageManager.saveExercise(seedExercise('ex1'));
    await storageManager.saveRoutine({ id: 'r1', name: 'Push Day', days: [makeDay('d1')] });
    await storageManager.saveRoutine({
      id: 'r2',
      name: 'Pull Day',
      days: [makeDay('d1', [{ exerciseId: 'ex1', sets: 3, reps: '10', dropset: false, toFailure: false }])],
    });
    expect(await storageManager.getRoutines()).toHaveLength(2);
  });

  it('updates an existing routine when saved with same id', async () => {
    await storageManager.saveExercise(seedExercise('ex1'));
    await storageManager.saveRoutine({ id: 'r1', name: 'Push Day', days: [makeDay('d1')] });
    await storageManager.saveRoutine({
      id: 'r1',
      name: 'Push Day Updated',
      days: [makeDay('d1', [{ exerciseId: 'ex1', sets: 4, reps: '8', dropset: true, toFailure: false }])],
    });
    const routines = await storageManager.getRoutines();
    expect(routines).toHaveLength(1);
    expect(routines[0].name).toBe('Push Day Updated');
    expect(routines[0].days[0].exercises[0].exerciseId).toBe('ex1');
  });

  // --- deleteRoutine ---

  it('deletes a routine by id', async () => {
    await storageManager.saveRoutine({ id: 'r1', name: 'Push Day', days: [makeDay('d1')] });
    await storageManager.saveRoutine({ id: 'r2', name: 'Leg Day', days: [makeDay('d1')] });
    await storageManager.deleteRoutine('r1');
    const routines = await storageManager.getRoutines();
    expect(routines).toHaveLength(1);
    expect(routines[0].id).toBe('r2');
  });

  it('does nothing when deleting a non-existent routine id', async () => {
    await storageManager.saveRoutine({ id: 'r1', name: 'Push Day', days: [makeDay('d1')] });
    await storageManager.deleteRoutine('does-not-exist');
    expect(await storageManager.getRoutines()).toHaveLength(1);
  });

  it('results in an empty list after all routines are deleted', async () => {
    await storageManager.saveRoutine({ id: 'r1', name: 'Push Day', days: [makeDay('d1')] });
    await storageManager.deleteRoutine('r1');
    expect(await storageManager.getRoutines()).toEqual([]);
  });

  // --- persistence ---

  it('persists routines across separate getRoutines calls', async () => {
    await storageManager.saveExercise(seedExercise('ex1'));
    const ex = { exerciseId: 'ex1', sets: 3, reps: '10', dropset: false, toFailure: false };
    await storageManager.saveRoutine({ id: 'r1', name: 'Push Day', days: [makeDay('d1', [ex])] });
    expect(await storageManager.getRoutines()).toEqual(await storageManager.getRoutines());
    expect((await storageManager.getRoutines())[0].days[0].exercises[0].exerciseId).toBe('ex1');
  });

  // --- migration from old formats ---

  it('migrates routines stored in old exerciseIds format', async () => {
    await storageManager.saveExercise(seedExercise('ex1'));
    await storageManager.saveExercise(seedExercise('ex2'));
    const oldFormat = JSON.stringify([
      { id: 'r1', name: 'Push Day', exerciseIds: ['ex1', 'ex2'] },
    ]);
    localStorage.setItem('lift_routines_v1', oldFormat);
    const routines = await storageManager.getRoutines();
    expect(routines).toHaveLength(1);
    expect(routines[0].days).toHaveLength(1);
    expect(routines[0].days[0].exercises).toHaveLength(2);
    expect(routines[0].days[0].exercises[0]).toEqual({
      exerciseId: 'ex1',
      sets: 3,
      reps: '10',
      dropset: false,
      toFailure: false,
    });
  });

  it('migrates legacy flat exercises into a single day', async () => {
    await storageManager.saveExercise(seedExercise('ex1'));
    const oldFormat = JSON.stringify([
      {
        id: 'r1',
        name: 'Push Day',
        exercises: [{ exerciseId: 'ex1', sets: 3, reps: '10', dropset: false, toFailure: false }],
      },
    ]);
    localStorage.setItem('lift_routines_v1', oldFormat);
    const routines = await storageManager.getRoutines();
    expect(routines[0].days).toHaveLength(1);
    expect(routines[0].days[0].exercises[0].exerciseId).toBe('ex1');
  });

  it('migrates reps from number to string when loading old data', async () => {
    await storageManager.saveExercise(seedExercise('ex1'));
    const oldFormat = JSON.stringify([
      {
        id: 'r1',
        name: 'Push Day',
        days: [makeDay('d1', [{ exerciseId: 'ex1', sets: 3, reps: 10 as unknown as string, dropset: false, toFailure: false }])],
      },
    ]);
    localStorage.setItem('lift_routines_v1', oldFormat);
    const routines = await storageManager.getRoutines();
    expect(routines[0].days[0].exercises[0].reps).toBe('10');
  });

  it('deletes exercises from a removed group and cleans routine references', async () => {
    await storageManager.addMuscleGroup('Pecho');
    await storageManager.saveExercise({ id: 'ex-keep', name: 'Squat', muscleGroup: 'Pierna', logs: [] });
    await storageManager.saveExercise({ id: 'ex-main', name: 'Bench', muscleGroup: 'Pecho', logs: [] });
    await storageManager.saveExercise({ id: 'ex-alt', name: 'Fly', muscleGroup: 'Pecho', logs: [] });
    await storageManager.saveRoutine({
      id: 'r1',
      name: 'Test',
      days: [makeDay('d1', [
        { exerciseId: 'ex-main', sets: 3, reps: '8', dropset: false, toFailure: false },
        { exerciseId: 'ex-keep', alternativeExerciseId: 'ex-alt', sets: 3, reps: '10', dropset: false, toFailure: false },
      ])],
    });

    await storageManager.deleteMuscleGroup('Pecho');

    expect((await storageManager.getExercises()).map((exercise) => exercise.id)).toEqual(['ex-keep']);
    expect(await storageManager.getMuscleGroups()).not.toContain('Pecho');
    expect((await storageManager.getRoutines())[0].days[0].exercises).toEqual([
      { exerciseId: 'ex-keep', sets: 3, reps: '10', dropset: false, toFailure: false },
    ]);
  });

  it('only removes the group when it has no exercises', async () => {
    await storageManager.addMuscleGroup('Movilidad');
    await storageManager.saveExercise({ id: 'ex-1', name: 'Plank', muscleGroup: 'Core', logs: [] });

    await storageManager.deleteMuscleGroup('Movilidad');

    expect((await storageManager.getExercises()).map((exercise) => exercise.id)).toEqual(['ex-1']);
    expect(await storageManager.getMuscleGroups()).not.toContain('Movilidad');
  });

  it('reorders exercises within a day', async () => {
    await storageManager.saveExercise(seedExercise('ex1'));
    await storageManager.saveExercise(seedExercise('ex2'));
    await storageManager.saveRoutine({
      id: 'r1',
      name: 'Test',
      days: [makeDay('d1', [
        { exerciseId: 'ex1', sets: 3, reps: '10', dropset: false, toFailure: false },
        { exerciseId: 'ex2', sets: 3, reps: '10', dropset: false, toFailure: false },
      ])],
    });

    await storageManager.reorderRoutineExercise('r1', 'd1', 0, 1);

    const routines = await storageManager.getRoutines();
    expect(routines[0].days[0].exercises[0].exerciseId).toBe('ex2');
    expect(routines[0].days[0].exercises[1].exerciseId).toBe('ex1');
  });

  it('resets data to defaults and clears routines', async () => {
    await storageManager.addMuscleGroup('CustomGroup');
    await storageManager.saveExercise(seedExercise('ex1'));
    await storageManager.saveRoutine({ id: 'r1', name: 'Test', days: [makeDay('d1')] });

    await storageManager.resetData();

    const groups = await storageManager.getMuscleGroups();
    expect(groups).not.toContain('CustomGroup');
    expect(groups).toContain('Pecho');

    const exercises = await storageManager.getExercises();
    expect(exercises.some((exercise) => exercise.id === 'ex1')).toBe(false);
    expect(exercises.length).toBeGreaterThan(0);

    expect(await storageManager.getRoutines()).toEqual([]);
  });
});
