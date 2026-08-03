import {
  Firestore,
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  getDocs,
  getDoc,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { Exercise, GroupSortPreference, Routine } from '../../types';
import { getDefaultExercises, getDefaultMuscleGroups } from './seedData';
import { DEFAULT_GROUP_SORT_PREFERENCE } from '../../utils/exerciseSorting';

export interface DataStoreStatus {
  hasPendingWrites: boolean;
  fromCache: boolean;
}

export interface DataStoreSnapshot {
  exercises: Exercise[];
  routines: Routine[];
  muscleGroups: string[];
  groupSortPreference: GroupSortPreference;
}

export interface DataStore {
  uid: string;
  subscribe(
    onData: (snapshot: DataStoreSnapshot) => void,
    onStatus: (status: DataStoreStatus) => void
  ): () => void;
  hasData(): Promise<boolean>;
  saveExercise(exercise: Exercise): Promise<void>;
  deleteExercise(id: string): Promise<void>;
  saveRoutine(routine: Routine): Promise<void>;
  deleteRoutine(id: string): Promise<void>;
  saveMuscleGroups(groups: string[]): Promise<void>;
  saveGroupSortPreference(preference: GroupSortPreference): Promise<void>;
  resetData(): Promise<void>;
}

function deepClean<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(deepClean) as unknown as T;
  if (typeof obj !== 'object') return obj;
  if ((obj as Record<string, unknown>).constructor !== Object) return obj;
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (v !== undefined) cleaned[k] = deepClean(v);
  }
  return cleaned as T;
}

function normalizeExercise(data: Exercise): Exercise {
  return {
    ...data,
    updatedAt: normalizeTimestamp(data.updatedAt),
  };
}

function normalizeRoutine(data: Routine): Routine {
  return {
    ...data,
    updatedAt: normalizeTimestamp(data.updatedAt),
  };
}

function normalizeTimestamp(value: string | Timestamp | undefined | null): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  return undefined;
}

export function createFirestoreDataStore(db: Firestore, uid: string): DataStore {
  const exercisesRef = collection(db, 'users', uid, 'exercises');
  const routinesRef = collection(db, 'users', uid, 'routines');
  const groupsDoc = doc(db, 'users', uid, 'metadata', 'groups');
  const sortDoc = doc(db, 'users', uid, 'metadata', 'sort');

  const withOwner = <T extends Record<string, unknown>>(data: T): T => ({
    ...data,
    ownerId: uid,
  });

  async function nextExerciseOrder(): Promise<number> {
    const snapshot = await getDocs(exercisesRef);
    let max = -1;
    snapshot.forEach((d) => {
      const value = (d.data() as { order?: number }).order;
      if (typeof value === 'number' && value > max) max = value;
    });
    return max + 1;
  }

  async function nextRoutineOrder(): Promise<number> {
    const snapshot = await getDocs(routinesRef);
    let max = -1;
    snapshot.forEach((d) => {
      const value = (d.data() as { order?: number }).order;
      if (typeof value === 'number' && value > max) max = value;
    });
    return max + 1;
  }

  return {
    uid,

    async hasData() {
      const [exercisesSnapshot, groupsSnapshot] = await Promise.all([
        getDocs(exercisesRef),
        getDoc(groupsDoc),
      ]);
      const groups = groupsSnapshot.data();
      return exercisesSnapshot.size > 0 || (Array.isArray(groups?.items) && groups.items.length > 0);
    },

    subscribe(onData, onStatus) {
      let exercises: Exercise[] = [];
      let routines: Routine[] = [];
      let muscleGroups: string[] = [];
      let groupSortPreference: GroupSortPreference = DEFAULT_GROUP_SORT_PREFERENCE;

      const emit = () => {
        onData({ exercises, routines, muscleGroups, groupSortPreference });
      };

      const unsubscribeExercises = onSnapshot(
        query(exercisesRef, orderBy('order', 'asc')),
        (snapshot) => {
          exercises = snapshot.docs.map((d) => normalizeExercise(d.data() as Exercise));
          onStatus({ hasPendingWrites: snapshot.metadata.hasPendingWrites, fromCache: snapshot.metadata.fromCache });
          emit();
        },
        (error) => {
          console.error('Exercises listener error', error);
        }
      );

      const unsubscribeRoutines = onSnapshot(
        query(routinesRef, orderBy('order', 'asc')),
        (snapshot) => {
          routines = snapshot.docs.map((d) => normalizeRoutine(d.data() as Routine));
          onStatus({ hasPendingWrites: snapshot.metadata.hasPendingWrites, fromCache: snapshot.metadata.fromCache });
          emit();
        },
        (error) => {
          console.error('Routines listener error', error);
        }
      );

      const unsubscribeGroups = onSnapshot(
        groupsDoc,
        (snapshot) => {
          const data = snapshot.data();
          muscleGroups = Array.isArray(data?.items) ? (data.items as string[]) : [];
          onStatus({ hasPendingWrites: snapshot.metadata.hasPendingWrites, fromCache: snapshot.metadata.fromCache });
          emit();
        },
        (error) => {
          console.error('Groups listener error', error);
        }
      );

      const unsubscribeSort = onSnapshot(
        sortDoc,
        (snapshot) => {
          const data = snapshot.data();
          if (data && typeof data === 'object') {
            const field = data.field;
            const direction = data.direction;
            if (
              (field === 'progress' || field === 'weight') &&
              (direction === 'asc' || direction === 'desc')
            ) {
              groupSortPreference = { field, direction };
            }
          }
          onStatus({ hasPendingWrites: snapshot.metadata.hasPendingWrites, fromCache: snapshot.metadata.fromCache });
          emit();
        },
        (error) => {
          console.error('Sort preference listener error', error);
        }
      );

      return () => {
        unsubscribeExercises();
        unsubscribeRoutines();
        unsubscribeGroups();
        unsubscribeSort();
      };
    },

    async saveExercise(exercise) {
      const order = typeof exercise.order === 'number' ? exercise.order : await nextExerciseOrder();
      await setDoc(
        doc(exercisesRef, exercise.id),
        deepClean(withOwner({ ...exercise, order, updatedAt: new Date().toISOString() })),
        { merge: true }
      );
    },

    async deleteExercise(id) {
      await deleteDoc(doc(exercisesRef, id));
    },

    async saveRoutine(routine) {
      const order = typeof routine.order === 'number' ? routine.order : await nextRoutineOrder();
      await setDoc(
        doc(routinesRef, routine.id),
        deepClean(withOwner({ ...routine, order, updatedAt: new Date().toISOString() })),
        { merge: true }
      );
    },

    async deleteRoutine(id) {
      await deleteDoc(doc(routinesRef, id));
    },

    async saveMuscleGroups(groups) {
      await setDoc(
        groupsDoc,
        withOwner({ items: groups, updatedAt: new Date().toISOString() }),
        { merge: true }
      );
    },

    async saveGroupSortPreference(preference) {
      await setDoc(
        sortDoc,
        withOwner({ ...preference, updatedAt: new Date().toISOString() }),
        { merge: true }
      );
    },

    async resetData() {
      const batch = writeBatch(db);
      const exerciseDocs = await getDocs(exercisesRef);
      const routineDocs = await getDocs(routinesRef);
      exerciseDocs.docs.forEach((d) => batch.delete(d.ref));
      routineDocs.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();

      const seedGroups = getDefaultMuscleGroups();
      const seedExercises = getDefaultExercises().map((exercise, index) => ({
        ...exercise,
        order: index,
      }));
      await this.saveMuscleGroups(seedGroups);
      for (const exercise of seedExercises) {
        await this.saveExercise(exercise);
      }
    },

  };
}
