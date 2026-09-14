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
import type { Exercise, Routine, Workout } from '../domain';
import { getDefaultExercises, getDefaultMuscleGroups } from './seedData';

import type { SyncStatus, TrainingRepository, TrainingSnapshot } from '../domain/TrainingRepository';
export type { SyncStatus, TrainingRepository, TrainingSnapshot } from '../domain/TrainingRepository';

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
    days: data.days.map((day) => ({
      ...day,
      exercises: day.exercises.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        sets: exercise.sets,
        reps: exercise.reps,
        dropset: exercise.dropset,
        toFailure: exercise.toFailure,
        restSeconds: exercise.restSeconds,
      })),
    })),
    updatedAt: normalizeTimestamp(data.updatedAt),
  };
}

function normalizeTimestamp(value: string | Timestamp | undefined | null): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  return undefined;
}

export function createFirestoreTrainingRepository(
  db: Firestore,
  uid: string
): TrainingRepository {
  const exercisesRef = collection(db, 'users', uid, 'exercises');
  const routinesRef = collection(db, 'users', uid, 'routines');
  const workoutsRef = collection(db, 'users', uid, 'workouts');
  const groupsDoc = doc(db, 'users', uid, 'metadata', 'groups');
  let currentSnapshot: TrainingSnapshot = {
    exercises: [],
    routines: [],
    muscleGroups: [],
    workouts: [],
  };

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
    getSnapshot() {
      return currentSnapshot;
    },

    subscribe(onData, onStatus) {
      let exercises: Exercise[] = [];
      let routines: Routine[] = [];
      let muscleGroups: string[] = [];
      let workouts: Workout[] = [];

      const emit = () => {
        currentSnapshot = { exercises, routines, muscleGroups, workouts };
        onData(currentSnapshot);
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

      const unsubscribeWorkouts = onSnapshot(
        query(workoutsRef, orderBy('startedAt', 'desc')),
        (snapshot) => {
          workouts = snapshot.docs.map((d) => d.data() as Workout);
          onStatus({ hasPendingWrites: snapshot.metadata.hasPendingWrites, fromCache: snapshot.metadata.fromCache });
          emit();
        },
        (error) => {
          console.error('Workouts listener error', error);
        }
      );

      return () => {
        unsubscribeExercises();
        unsubscribeRoutines();
        unsubscribeGroups();
        unsubscribeWorkouts();
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

    async saveWorkout(workout) {
      await setDoc(
        doc(workoutsRef, workout.id),
        deepClean(withOwner({ ...workout, updatedAt: new Date().toISOString() })),
        { merge: true }
      );
    },

    async deleteWorkout(id) {
      await deleteDoc(doc(workoutsRef, id));
    },

    async resetData() {
      const batch = writeBatch(db);
      const exerciseDocs = await getDocs(exercisesRef);
      const routineDocs = await getDocs(routinesRef);
      const workoutDocs = await getDocs(workoutsRef);
      exerciseDocs.docs.forEach((d) => batch.delete(d.ref));
      routineDocs.docs.forEach((d) => batch.delete(d.ref));
      workoutDocs.docs.forEach((d) => batch.delete(d.ref));
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
