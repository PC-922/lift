import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  writeBatch,
  Firestore,
} from 'firebase/firestore';
import { Exercise, ExerciseLog, GroupSortPreference, Routine, RoutineExercise, StorageManagerInterface } from '../../types';
import { DEFAULT_GROUP_SORT_PREFERENCE } from '../../utils/exerciseSorting';
import { getDefaultExercises, getDefaultMuscleGroups } from './seedData';

export class FirestoreAdapter implements StorageManagerInterface {
  constructor(
    private db: Firestore,
    private uid: string
  ) {}

  private exercisesRef() {
    return collection(this.db, 'users', this.uid, 'exercises');
  }

  private routinesRef() {
    return collection(this.db, 'users', this.uid, 'routines');
  }

  private groupsDoc() {
    return doc(this.db, 'users', this.uid, 'metadata', 'groups');
  }

  private prefsDoc() {
    return doc(this.db, 'users', this.uid, 'metadata', 'prefs');
  }

  async getExercises(): Promise<Exercise[]> {
    const snapshot = await getDocs(this.exercisesRef());
    if (!snapshot.empty) {
      return snapshot.docs.map((d) => d.data() as Exercise);
    }
    const seed = getDefaultExercises();
    const batch = writeBatch(this.db);
    seed.forEach((exercise) => {
      batch.set(doc(this.exercisesRef(), exercise.id), exercise);
    });
    await batch.commit();
    return seed;
  }

  async saveExercise(exercise: Exercise): Promise<void> {
    await setDoc(doc(this.exercisesRef(), exercise.id), exercise);
  }

  async deleteExercise(id: string): Promise<void> {
    await deleteDoc(doc(this.exercisesRef(), id));

    const batch = writeBatch(this.db);
    const routinesSnapshot = await getDocs(this.routinesRef());
    routinesSnapshot.docs.forEach((d) => {
      const routine = d.data() as Routine;
      let changed = false;
      const cleanedDays = routine.days.map((day) => {
        const cleaned = day.exercises
          .filter((re) => re.exerciseId !== id)
          .map((re) => {
            if (re.alternativeExerciseId === id) {
              changed = true;
              return { ...re, alternativeExerciseId: undefined };
            }
            return re;
          });
        if (cleaned.length !== day.exercises.length) changed = true;
        return { ...day, exercises: cleaned };
      });
      if (changed) {
        batch.set(d.ref, { ...routine, days: cleanedDays });
      }
    });
    await batch.commit();
  }

  async updateExerciseDetails(id: string, name: string, muscleGroup: string): Promise<void> {
    const exercise = (await this.getExercises()).find((e) => e.id === id);
    if (!exercise) return;
    await this.saveExercise({ ...exercise, name, muscleGroup });
  }

  async logSession(exerciseId: string, weight: number | null, reps: number | null): Promise<void> {
    const exercises = await this.getExercises();
    const exercise = exercises.find((e) => e.id === exerciseId);
    if (!exercise) return;
    const today = new Date().toISOString().split('T')[0];
    const logs = [...exercise.logs];
    const index = logs.findIndex((l) => l.date === today);
    const newLog: ExerciseLog = { date: today, weight, reps };
    if (index >= 0) {
      logs[index] = newLog;
    } else {
      logs.push(newLog);
    }
    await this.saveExercise({ ...exercise, logs });
  }

  async updateExerciseNote(id: string, note: string): Promise<void> {
    const exercises = await this.getExercises();
    const exercise = exercises.find((e) => e.id === id);
    if (!exercise) return;
    const trimmedNote = note.trim();
    await this.saveExercise({ ...exercise, note: trimmedNote.length > 0 ? trimmedNote : undefined });
  }

  async updateExerciseLog(exerciseId: string, originalDate: string, log: ExerciseLog): Promise<void> {
    const exercises = await this.getExercises();
    const exercise = exercises.find((e) => e.id === exerciseId);
    if (!exercise) return;
    const logs = [...exercise.logs];
    const originalIndex = logs.findIndex((item) => item.date === originalDate);
    if (originalIndex === -1) return;
    const existingIndex = logs.findIndex((item) => item.date === log.date);
    if (existingIndex !== -1 && existingIndex !== originalIndex) {
      logs[existingIndex] = log;
      logs.splice(originalIndex, 1);
    } else {
      logs[originalIndex] = log;
    }
    await this.saveExercise({ ...exercise, logs });
  }

  async deleteExerciseLog(exerciseId: string, date: string): Promise<void> {
    const exercises = await this.getExercises();
    const exercise = exercises.find((e) => e.id === exerciseId);
    if (!exercise) return;
    await this.saveExercise({ ...exercise, logs: exercise.logs.filter((l) => l.date !== date) });
  }

  async deleteAllLogs(exerciseId: string): Promise<void> {
    const exercises = await this.getExercises();
    const exercise = exercises.find((e) => e.id === exerciseId);
    if (!exercise) return;
    await this.saveExercise({ ...exercise, logs: [] });
  }

  async deleteAllLogsExceptLatest(exerciseId: string): Promise<void> {
    const exercises = await this.getExercises();
    const exercise = exercises.find((e) => e.id === exerciseId);
    if (!exercise || exercise.logs.length <= 1) return;
    const sorted = [...exercise.logs].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    await this.saveExercise({ ...exercise, logs: [sorted[0]] });
  }

  async getMuscleGroups(): Promise<string[]> {
    const snapshot = await getDocs(collection(this.db, 'users', this.uid, 'metadata'));
    const groupsDoc = snapshot.docs.find((d) => d.id === 'groups');
    const items = groupsDoc?.data().items;
    if (Array.isArray(items) && items.length > 0) {
      return items;
    }
    const groups = getDefaultMuscleGroups();
    await setDoc(this.groupsDoc(), { items: groups });
    return groups;
  }

  async addMuscleGroup(group: string): Promise<void> {
    const groups = await this.getMuscleGroups();
    if (groups.includes(group)) return;
    await setDoc(this.groupsDoc(), { items: [...groups, group] });
  }

  async deleteMuscleGroup(group: string): Promise<void> {
    const groups = (await this.getMuscleGroups()).filter((g) => g !== group);
    const exercises = await this.getExercises();
    const removedIds = new Set(exercises.filter((e) => e.muscleGroup === group).map((e) => e.id));

    const batch = writeBatch(this.db);

    exercises.forEach((exercise) => {
      if (exercise.muscleGroup === group) {
        batch.delete(doc(this.exercisesRef(), exercise.id));
      }
    });

    const routinesSnapshot = await getDocs(this.routinesRef());
    routinesSnapshot.docs.forEach((d) => {
      const routine = d.data() as Routine;
      let changed = false;
      const cleanedDays = routine.days.map((day) => {
        const cleaned = day.exercises
          .filter((re) => !removedIds.has(re.exerciseId))
          .map((re) => ({
            ...re,
            alternativeExerciseId: re.alternativeExerciseId && removedIds.has(re.alternativeExerciseId)
              ? undefined
              : re.alternativeExerciseId,
          }));
        if (cleaned.length !== day.exercises.length) changed = true;
        return { ...day, exercises: cleaned };
      });
      if (changed) {
        batch.set(d.ref, { ...routine, days: cleanedDays });
      }
    });

    batch.set(this.groupsDoc(), { items: groups });
    await batch.commit();
  }

  async renameMuscleGroup(oldName: string, newName: string): Promise<void> {
    const groups = await this.getMuscleGroups();
    const index = groups.indexOf(oldName);
    if (index === -1) return;
    groups[index] = newName;

    const batch = writeBatch(this.db);
    batch.set(this.groupsDoc(), { items: groups });

    const exercises = await this.getExercises();
    exercises.forEach((exercise) => {
      if (exercise.muscleGroup === oldName) {
        batch.set(doc(this.exercisesRef(), exercise.id), { ...exercise, muscleGroup: newName });
      }
    });

    await batch.commit();
  }

  async getGroupSortPreference(): Promise<GroupSortPreference> {
    const snapshot = await getDocs(collection(this.db, 'users', this.uid, 'metadata'));
    const prefsDoc = snapshot.docs.find((d) => d.id === 'prefs');
    const preference = prefsDoc?.data().groupSortPreference;
    if (preference && (preference.field === 'progress' || preference.field === 'weight') && (preference.direction === 'asc' || preference.direction === 'desc')) {
      return preference as GroupSortPreference;
    }
    return DEFAULT_GROUP_SORT_PREFERENCE;
  }

  async saveGroupSortPreference(preference: GroupSortPreference): Promise<void> {
    const current = (await getDocs(collection(this.db, 'users', this.uid, 'metadata')))
      .docs.find((d) => d.id === 'prefs')?.data() ?? {};
    await setDoc(this.prefsDoc(), { ...current, groupSortPreference: preference });
  }

  async resetData(): Promise<void> {
    const batch = writeBatch(this.db);
    const exercisesSnapshot = await getDocs(this.exercisesRef());
    exercisesSnapshot.docs.forEach((d) => batch.delete(d.ref));
    const routinesSnapshot = await getDocs(this.routinesRef());
    routinesSnapshot.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(this.groupsDoc());
    await batch.commit();
  }

  async getRoutines(): Promise<Routine[]> {
    const snapshot = await getDocs(this.routinesRef());
    const exerciseIds = new Set((await this.getExercises()).map((ex) => ex.id));
    return snapshot.docs.map((d) => d.data() as Routine).map((routine) => {
      const days = routine.days?.map((day) => ({
        ...day,
        exercises: day.exercises
          .filter((re) => exerciseIds.has(re.exerciseId))
          .map((re) => ({
            ...re,
            alternativeExerciseId: re.alternativeExerciseId && exerciseIds.has(re.alternativeExerciseId)
              ? re.alternativeExerciseId
              : undefined,
          })),
      })) ?? [];
      return { ...routine, days };
    });
  }

  async saveRoutine(routine: Routine): Promise<void> {
    await setDoc(doc(this.routinesRef(), routine.id), routine);
  }

  async deleteRoutine(id: string): Promise<void> {
    await deleteDoc(doc(this.routinesRef(), id));
  }

  async reorderRoutine(fromIndex: number, toIndex: number): Promise<void> {
    const routines = await this.getRoutines();
    if (fromIndex < 0 || fromIndex >= routines.length || toIndex < 0 || toIndex >= routines.length) return;
    const [moved] = routines.splice(fromIndex, 1);
    routines.splice(toIndex, 0, moved);
    await this.saveAllRoutines(routines);
  }

  async reorderRoutineExercise(routineId: string, dayId: string, fromIndex: number, toIndex: number): Promise<void> {
    const routine = (await this.getRoutines()).find((r) => r.id === routineId);
    if (!routine) return;
    const day = routine.days.find((d) => d.id === dayId);
    if (!day) return;
    const exercises = [...day.exercises];
    const [moved] = exercises.splice(fromIndex, 1);
    exercises.splice(toIndex, 0, moved);
    const days = routine.days.map((d) => (d.id === dayId ? { ...d, exercises } : d));
    await this.saveRoutine({ ...routine, days });
  }

  private async saveAllRoutines(routines: Routine[]): Promise<void> {
    const batch = writeBatch(this.db);
    routines.forEach((routine) => {
      batch.set(doc(this.routinesRef(), routine.id), routine);
    });
    await batch.commit();
  }

  async exportData(): Promise<string> {
    const backup = {
      exercises: await this.getExercises(),
      groups: await this.getMuscleGroups(),
      routines: await this.getRoutines(),
    };
    return JSON.stringify(backup, null, 2);
  }

  async importData(jsonString: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(jsonString) as unknown;
      let exercisesToImport: Exercise[] = [];
      let groupsToImport: string[] = [];
      let routinesToImport: Routine[] = [];

      if (Array.isArray(parsed)) {
        exercisesToImport = parsed;
      } else if (typeof parsed === 'object' && parsed !== null && 'exercises' in parsed) {
        const data = parsed as { exercises: unknown[]; groups?: unknown; routines?: unknown };
        exercisesToImport = Array.isArray(data.exercises) ? data.exercises as Exercise[] : [];
        if (Array.isArray(data.groups)) {
          groupsToImport = data.groups.filter((item): item is string => typeof item === 'string');
        }
        if (Array.isArray(data.routines)) {
          routinesToImport = data.routines.flatMap((routine) => {
            const raw = routine as { id?: unknown; name?: unknown; days?: unknown; exercises?: unknown };
            if (typeof raw.id !== 'string' || typeof raw.name !== 'string') return [];
            if (Array.isArray(raw.days)) return [routine as Routine];
            const legacyExercises = Array.isArray(raw.exercises) ? raw.exercises as RoutineExercise[] : [];
            return [{
              id: raw.id,
              name: raw.name,
              days: [{ id: `day_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, name: 'Day 1', exercises: legacyExercises }],
            }];
          });
        }
      } else {
        return false;
      }

      const batch = writeBatch(this.db);
      exercisesToImport.forEach((exercise) => {
        batch.set(doc(this.exercisesRef(), exercise.id), exercise);
      });
      routinesToImport.forEach((routine) => {
        batch.set(doc(this.routinesRef(), routine.id), routine);
      });
      if (groupsToImport.length > 0) {
        const currentGroups = await this.getMuscleGroups();
        batch.set(this.groupsDoc(), { items: Array.from(new Set([...currentGroups, ...groupsToImport])) });
      }
      await batch.commit();
      return true;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  }
}
