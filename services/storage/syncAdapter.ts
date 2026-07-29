import { Exercise, Routine, StorageManagerInterface, Tombstone } from '../../types';
import { mergeSyncData, SyncMergeOutput } from '../../utils/syncMerge';
import { FirestoreGateway, PulledData } from './firestoreGateway';
import { LocalStorageAdapter } from './localStorageAdapter';

function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine !== false;
}

export class SyncAdapter implements StorageManagerInterface {
  constructor(
    private local: LocalStorageAdapter,
    private gateway: FirestoreGateway,
    private uid: string
  ) {}

  async sync(): Promise<void> {
    if (!isOnline()) return;

    try {
      const remote = await this.gateway.pullData(this.uid);
      const merged = await this.mergeWithRemote(remote);
      await this.local.replaceAllData(
        merged.exercises,
        merged.routines,
        merged.groups,
        merged.tombstones
      );
      await this.gateway.pushData(
        this.uid,
        merged.exercises,
        merged.routines,
        merged.groups,
        merged.tombstones,
        remote
      );
    } catch (error) {
      // Fail silently; the next online event or app foreground will retry.
      console.error('Sync failed', error);
    }
  }

  private async mergeWithRemote(remote: PulledData): Promise<SyncMergeOutput> {
    const localExercises = await this.local.getExercises();
    const localRoutines = await this.local.getRoutines();
    const localGroups = await this.local.getMuscleGroups();
    const localTombstones = this.local.getTombstones();

    return mergeSyncData({
      localExercises,
      remoteExercises: remote.exercises,
      localRoutines,
      remoteRoutines: remote.routines,
      localTombstones,
      remoteTombstones: remote.tombstones,
      localGroups,
      remoteGroups: remote.groups,
    });
  }

  private async pushExerciseById(id: string): Promise<void> {
    if (!isOnline()) return;
    const exercise = (await this.local.getExercises()).find((e) => e.id === id);
    if (exercise) {
      await this.gateway.pushExercise(this.uid, exercise);
    }
  }

  private async pushRoutineById(id: string): Promise<void> {
    if (!isOnline()) return;
    const routine = (await this.local.getRoutines()).find((r) => r.id === id);
    if (routine) {
      await this.gateway.pushRoutine(this.uid, routine);
    }
  }

  async getExercises(): Promise<Exercise[]> {
    return this.local.getExercises();
  }

  async saveExercise(exercise: Exercise): Promise<void> {
    await this.local.saveExercise(exercise);
    await this.pushExerciseById(exercise.id);
  }

  async deleteExercise(id: string): Promise<void> {
    await this.local.deleteExercise(id);
    await this.sync();
  }

  async updateExerciseDetails(id: string, name: string, muscleGroup: string): Promise<void> {
    await this.local.updateExerciseDetails(id, name, muscleGroup);
    await this.pushExerciseById(id);
  }

  async logSession(exerciseId: string, weight: number | null, reps: number | null): Promise<void> {
    await this.local.logSession(exerciseId, weight, reps);
    await this.pushExerciseById(exerciseId);
  }

  async updateExerciseNote(id: string, note: string): Promise<void> {
    await this.local.updateExerciseNote(id, note);
    await this.pushExerciseById(id);
  }

  async updateExerciseLog(exerciseId: string, originalDate: string, log: { date: string; weight: number | null; reps: number | null }): Promise<void> {
    await this.local.updateExerciseLog(exerciseId, originalDate, log);
    await this.pushExerciseById(exerciseId);
  }

  async deleteExerciseLog(exerciseId: string, date: string): Promise<void> {
    await this.local.deleteExerciseLog(exerciseId, date);
    await this.pushExerciseById(exerciseId);
  }

  async deleteAllLogs(exerciseId: string): Promise<void> {
    await this.local.deleteAllLogs(exerciseId);
    await this.pushExerciseById(exerciseId);
  }

  async deleteAllLogsExceptLatest(exerciseId: string): Promise<void> {
    await this.local.deleteAllLogsExceptLatest(exerciseId);
    await this.pushExerciseById(exerciseId);
  }

  async getMuscleGroups(): Promise<string[]> {
    return this.local.getMuscleGroups();
  }

  async addMuscleGroup(group: string): Promise<void> {
    await this.local.addMuscleGroup(group);
    await this.sync();
  }

  async deleteMuscleGroup(group: string): Promise<void> {
    await this.local.deleteMuscleGroup(group);
    await this.sync();
  }

  async renameMuscleGroup(oldName: string, newName: string): Promise<void> {
    await this.local.renameMuscleGroup(oldName, newName);
    await this.sync();
  }

  async getGroupSortPreference(): Promise<{ field: 'progress' | 'weight'; direction: 'asc' | 'desc' }> {
    return this.local.getGroupSortPreference();
  }

  async saveGroupSortPreference(preference: { field: 'progress' | 'weight'; direction: 'asc' | 'desc' }): Promise<void> {
    await this.local.saveGroupSortPreference(preference);
  }

  async getRoutines(): Promise<Routine[]> {
    return this.local.getRoutines();
  }

  async saveRoutine(routine: Routine): Promise<void> {
    await this.local.saveRoutine(routine);
    await this.pushRoutineById(routine.id);
  }

  async deleteRoutine(id: string): Promise<void> {
    await this.local.deleteRoutine(id);
    await this.sync();
  }

  async reorderRoutine(fromIndex: number, toIndex: number): Promise<void> {
    await this.local.reorderRoutine(fromIndex, toIndex);
    await this.sync();
  }

  async reorderRoutineExercise(routineId: string, dayId: string, fromIndex: number, toIndex: number): Promise<void> {
    await this.local.reorderRoutineExercise(routineId, dayId, fromIndex, toIndex);
    await this.sync();
  }

  async exportData(): Promise<string> {
    return this.local.exportData();
  }

  async importData(jsonString: string): Promise<boolean> {
    const success = await this.local.importData(jsonString);
    if (success) await this.sync();
    return success;
  }

  async resetData(): Promise<void> {
    await this.local.resetData();
    await this.sync();
  }

  getTombstones(): { exercises: Record<string, Tombstone>; routines: Record<string, Tombstone> } {
    return this.local.getTombstones();
  }

  async replaceAllData(exercises: Exercise[], routines: Routine[], groups: string[], tombstones: { exercises: Record<string, Tombstone>; routines: Record<string, Tombstone> }): Promise<void> {
    await this.local.replaceAllData(exercises, routines, groups, tombstones);
  }
}
