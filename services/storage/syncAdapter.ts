import { Exercise, Routine, StorageManagerInterface, Tombstone } from '../../types';
import { mergeSyncData, SyncMergeOutput } from '../../utils/syncMerge';
import { FirestoreGateway, PulledData, SyncStatusSnapshot } from './firestoreGateway';
import { LocalStorageAdapter } from './localStorageAdapter';

function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine !== false;
}

export class SyncAdapter implements StorageManagerInterface {
  private exercises: Exercise[] = [];
  private routines: Routine[] = [];
  private groups: string[] = [];
  private tombstones: { exercises: Record<string, Tombstone>; routines: Record<string, Tombstone> } = {
    exercises: {},
    routines: {},
  };
  private loaded = false;
  private listeners = new Set<(data: { exercises: Exercise[]; routines: Routine[]; groups: string[] }) => void>();
  private statusListeners = new Set<(status: SyncStatusSnapshot) => void>();
  private unsubscribe?: () => void;

  constructor(
    private local: LocalStorageAdapter,
    private gateway: FirestoreGateway,
    private uid: string
  ) {}

  async init(): Promise<void> {
    if (this.loaded) return;

    const localExercises = await this.local.getExercises();
    const localRoutines = await this.local.getRoutines();
    const localGroups = await this.local.getMuscleGroups();
    const localTombstones = this.local.getTombstones();

    this.exercises = localExercises;
    this.routines = localRoutines;
    this.groups = localGroups;
    this.tombstones = localTombstones;
    this.loaded = true;

    this.unsubscribe = this.gateway.subscribe(
      this.uid,
      async (remote) => {
        const merged = await this.mergeWithRemote(remote);
        await this.applyMerged(merged);
        this.emit();
      },
      (status) => {
        this.statusListeners.forEach((cb) => cb(status));
      }
    );

    if (isOnline()) {
      await this.sync();
    }
  }

  dispose(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  subscribe(
    onData: (data: { exercises: Exercise[]; routines: Routine[]; groups: string[] }) => void
  ): () => void {
    this.listeners.add(onData);
    if (this.loaded) {
      onData({ exercises: this.exercises, routines: this.routines, groups: this.groups });
    }
    return () => {
      this.listeners.delete(onData);
    };
  }

  subscribeStatus(onStatus: (status: SyncStatusSnapshot) => void): () => void {
    this.statusListeners.add(onStatus);
    return () => {
      this.statusListeners.delete(onStatus);
    };
  }

  private emit(): void {
    this.listeners.forEach((cb) => cb({ exercises: this.exercises, routines: this.routines, groups: this.groups }));
  }

  private async mergeWithRemote(remote: PulledData): Promise<SyncMergeOutput> {
    return mergeSyncData({
      localExercises: this.exercises,
      remoteExercises: remote.exercises,
      localRoutines: this.routines,
      remoteRoutines: remote.routines,
      localTombstones: this.tombstones,
      remoteTombstones: remote.tombstones,
      localGroups: this.groups,
      remoteGroups: remote.groups,
    });
  }

  private async applyMerged(merged: SyncMergeOutput): Promise<void> {
    this.exercises = merged.exercises;
    this.routines = merged.routines;
    this.groups = merged.groups;
    this.tombstones = merged.tombstones;
    await this.local.replaceAllData(merged.exercises, merged.routines, merged.groups, merged.tombstones);
  }

  async sync(): Promise<void> {
    await this.init();
    if (!isOnline()) return;

    try {
      const remote = await this.gateway.pullData(this.uid);
      const merged = await this.mergeWithRemote(remote);
      await this.applyMerged(merged);
      this.emit();
      await this.gateway.pushData(this.uid, merged.exercises, merged.routines, merged.groups, merged.tombstones, remote);
    } catch (error) {
      console.error('Sync failed', error);
    }
  }

  private async pushExerciseById(id: string): Promise<void> {
    const exercise = this.exercises.find((e) => e.id === id);
    if (exercise) {
      await this.gateway.pushExercise(this.uid, exercise);
    }
  }

  private async pushRoutineById(id: string): Promise<void> {
    const routine = this.routines.find((r) => r.id === id);
    if (routine) {
      await this.gateway.pushRoutine(this.uid, routine);
    }
  }

  private async persistLocal(): Promise<void> {
    await this.local.replaceAllData(this.exercises, this.routines, this.groups, this.tombstones);
  }

  private async mutateAndPushExercise(id: string, mutator: () => void): Promise<void> {
    mutator();
    await this.persistLocal();
    this.emit();
    if (isOnline()) {
      await this.pushExerciseById(id);
    }
  }

  private async mutateAndPushRoutine(id: string, mutator: () => void): Promise<void> {
    mutator();
    await this.persistLocal();
    this.emit();
    if (isOnline()) {
      await this.pushRoutineById(id);
    }
  }

  async getExercises(): Promise<Exercise[]> {
    await this.init();
    return this.exercises;
  }

  async saveExercise(exercise: Exercise): Promise<void> {
    await this.init();
    await this.mutateAndPushExercise(exercise.id, () => {
      this.exercises = [...this.exercises.filter((e) => e.id !== exercise.id), exercise];
    });
  }

  async deleteExercise(id: string): Promise<void> {
    await this.init();
    await this.mutateAndPushExercise(id, () => {
      this.exercises = this.exercises.filter((e) => e.id !== id);
      this.tombstones.exercises[id] = { deletedAt: new Date().toISOString() };
    });
    await this.gateway.markExerciseDeleted(this.uid, id);
  }

  async updateExerciseDetails(id: string, name: string, muscleGroup: string): Promise<void> {
    await this.init();
    await this.mutateAndPushExercise(id, () => {
      this.exercises = this.exercises.map((e) =>
        e.id === id ? { ...e, name, muscleGroup, updatedAt: new Date().toISOString() } : e
      );
    });
  }

  async logSession(exerciseId: string, weight: number | null, reps: number | null): Promise<void> {
    await this.init();
    await this.mutateAndPushExercise(exerciseId, () => {
      this.exercises = this.exercises.map((e) => {
        if (e.id !== exerciseId) return e;
        const today = new Date().toISOString().split('T')[0];
        const existingIndex = e.logs.findIndex((log) => log.date === today);
        let logs: typeof e.logs;
        if (existingIndex >= 0) {
          logs = e.logs.map((log, index) =>
            index === existingIndex ? { date: today, weight, reps } : log
          );
        } else {
          logs = [...e.logs, { date: today, weight, reps }];
        }
        return { ...e, logs, updatedAt: new Date().toISOString() };
      });
    });
  }

  async updateExerciseNote(id: string, note: string): Promise<void> {
    await this.init();
    await this.mutateAndPushExercise(id, () => {
      this.exercises = this.exercises.map((e) =>
        e.id === id ? { ...e, note, updatedAt: new Date().toISOString() } : e
      );
    });
  }

  async updateExerciseLog(
    exerciseId: string,
    originalDate: string,
    log: { date: string; weight: number | null; reps: number | null }
  ): Promise<void> {
    await this.init();
    await this.mutateAndPushExercise(exerciseId, () => {
      this.exercises = this.exercises.map((e) => {
        if (e.id !== exerciseId) return e;
        const logs = e.logs.map((item) =>
          item.date === originalDate ? { ...log } : item
        );
        return { ...e, logs, updatedAt: new Date().toISOString() };
      });
    });
  }

  async deleteExerciseLog(exerciseId: string, date: string): Promise<void> {
    await this.init();
    await this.mutateAndPushExercise(exerciseId, () => {
      this.exercises = this.exercises.map((e) =>
        e.id === exerciseId
          ? { ...e, logs: e.logs.filter((log) => log.date !== date), updatedAt: new Date().toISOString() }
          : e
      );
    });
  }

  async deleteAllLogs(exerciseId: string): Promise<void> {
    await this.init();
    await this.mutateAndPushExercise(exerciseId, () => {
      this.exercises = this.exercises.map((e) =>
        e.id === exerciseId ? { ...e, logs: [], updatedAt: new Date().toISOString() } : e
      );
    });
  }

  async deleteAllLogsExceptLatest(exerciseId: string): Promise<void> {
    await this.init();
    await this.mutateAndPushExercise(exerciseId, () => {
      this.exercises = this.exercises.map((e) => {
        if (e.id !== exerciseId) return e;
        const sorted = [...e.logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return { ...e, logs: sorted.slice(0, 1), updatedAt: new Date().toISOString() };
      });
    });
  }

  async getMuscleGroups(): Promise<string[]> {
    await this.init();
    return this.groups;
  }

  async addMuscleGroup(group: string): Promise<void> {
    await this.init();
    if (this.groups.includes(group)) return;
    this.groups = [...this.groups, group];
    await this.persistLocal();
    this.emit();
    if (isOnline()) {
      await this.gateway.pushGroups(this.uid, this.groups);
    }
  }

  async deleteMuscleGroup(group: string): Promise<void> {
    await this.init();
    this.groups = this.groups.filter((g) => g !== group);
    this.exercises = this.exercises.filter((e) => e.muscleGroup !== group);
    await this.persistLocal();
    this.emit();
    if (isOnline()) {
      await this.sync();
    }
  }

  async renameMuscleGroup(oldName: string, newName: string): Promise<void> {
    await this.init();
    this.groups = this.groups.map((g) => (g === oldName ? newName : g));
    this.exercises = this.exercises.map((e) =>
      e.muscleGroup === oldName ? { ...e, muscleGroup: newName, updatedAt: new Date().toISOString() } : e
    );
    await this.persistLocal();
    this.emit();
    if (isOnline()) {
      await this.sync();
    }
  }

  async getGroupSortPreference(): Promise<{ field: 'progress' | 'weight'; direction: 'asc' | 'desc' }> {
    return this.local.getGroupSortPreference();
  }

  async saveGroupSortPreference(preference: { field: 'progress' | 'weight'; direction: 'asc' | 'desc' }): Promise<void> {
    return this.local.saveGroupSortPreference(preference);
  }

  async getRoutines(): Promise<Routine[]> {
    await this.init();
    return this.routines;
  }

  async saveRoutine(routine: Routine): Promise<void> {
    await this.init();
    await this.mutateAndPushRoutine(routine.id, () => {
      this.routines = [...this.routines.filter((r) => r.id !== routine.id), routine];
    });
  }

  async deleteRoutine(id: string): Promise<void> {
    await this.init();
    await this.mutateAndPushRoutine(id, () => {
      this.routines = this.routines.filter((r) => r.id !== id);
      this.tombstones.routines[id] = { deletedAt: new Date().toISOString() };
    });
    await this.gateway.markRoutineDeleted(this.uid, id);
  }

  async reorderRoutine(fromIndex: number, toIndex: number): Promise<void> {
    await this.init();
    const items = [...this.routines];
    const [moved] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, moved);
    this.routines = items;
    await this.persistLocal();
    this.emit();
    if (isOnline()) {
      await this.sync();
    }
  }

  async reorderRoutineExercise(
    routineId: string,
    dayId: string,
    fromIndex: number,
    toIndex: number
  ): Promise<void> {
    await this.init();
    this.routines = this.routines.map((routine) => {
      if (routine.id !== routineId) return routine;
      return {
        ...routine,
        days: routine.days.map((day) => {
          if (day.id !== dayId) return day;
          const items = [...day.exercises];
          const [moved] = items.splice(fromIndex, 1);
          items.splice(toIndex, 0, moved);
          return { ...day, exercises: items };
        }),
      };
    });
    await this.persistLocal();
    this.emit();
    if (isOnline()) {
      await this.pushRoutineById(routineId);
    }
  }

  async exportData(): Promise<string> {
    await this.init();
    return this.local.exportData();
  }

  async importData(jsonString: string): Promise<boolean> {
    const success = await this.local.importData(jsonString);
    if (!success) return false;
    this.exercises = await this.local.getExercises();
    this.routines = await this.local.getRoutines();
    this.groups = await this.local.getMuscleGroups();
    this.tombstones = this.local.getTombstones();
    this.loaded = true;
    this.emit();
    await this.sync();
    return true;
  }

  async resetData(): Promise<void> {
    await this.local.resetData();
    this.exercises = await this.local.getExercises();
    this.routines = await this.local.getRoutines();
    this.groups = await this.local.getMuscleGroups();
    this.tombstones = this.local.getTombstones();
    this.emit();
    if (isOnline()) {
      await this.sync();
    }
  }

  getTombstones(): { exercises: Record<string, Tombstone>; routines: Record<string, Tombstone> } {
    return this.tombstones;
  }

  async replaceAllData(
    exercises: Exercise[],
    routines: Routine[],
    groups: string[],
    tombstones: { exercises: Record<string, Tombstone>; routines: Record<string, Tombstone> }
  ): Promise<void> {
    this.exercises = exercises;
    this.routines = routines;
    this.groups = groups;
    this.tombstones = tombstones;
    await this.persistLocal();
    this.emit();
  }
}
