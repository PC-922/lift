import {
  Firestore,
  collection,
  doc,
  getDocFromServer,
  getDocsFromServer,
  setDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { Exercise, Routine, Tombstone } from '../../types';

export interface PulledData {
  exercises: Exercise[];
  routines: Routine[];
  groups: string[];
  tombstones: { exercises: Record<string, Tombstone>; routines: Record<string, Tombstone> };
}

export class FirestoreGateway {
  constructor(private db: Firestore) {}

  private exercisesRef(uid: string) {
    return collection(this.db, 'users', uid, 'exercises');
  }

  private routinesRef(uid: string) {
    return collection(this.db, 'users', uid, 'routines');
  }

  private groupsDoc(uid: string) {
    return doc(this.db, 'users', uid, 'metadata', 'groups');
  }

  private tombstonesDoc(uid: string) {
    return doc(this.db, 'users', uid, 'metadata', 'tombstones');
  }

  async pullData(uid: string): Promise<PulledData> {
    const [exercisesSnapshot, routinesSnapshot, groupsSnapshot, tombstonesSnapshot] = await Promise.all([
      getDocsFromServer(this.exercisesRef(uid)),
      getDocsFromServer(this.routinesRef(uid)),
      getDocFromServer(this.groupsDoc(uid)),
      getDocFromServer(this.tombstonesDoc(uid)),
    ]);

    const groupsData = groupsSnapshot.data();
    const tombstonesData = tombstonesSnapshot.data();

    return {
      exercises: exercisesSnapshot.docs.map((d) => d.data() as Exercise),
      routines: routinesSnapshot.docs.map((d) => d.data() as Routine),
      groups: Array.isArray(groupsData?.items) ? groupsData.items as string[] : [],
      tombstones: {
        exercises: (tombstonesData?.exercises as Record<string, Tombstone>) ?? {},
        routines: (tombstonesData?.routines as Record<string, Tombstone>) ?? {},
      },
    };
  }

  async pushExercise(uid: string, exercise: Exercise): Promise<void> {
    await setDoc(doc(this.exercisesRef(uid), exercise.id), exercise);
  }

  async pushRoutine(uid: string, routine: Routine): Promise<void> {
    await setDoc(doc(this.routinesRef(uid), routine.id), routine);
  }

  async pushData(
    uid: string,
    exercises: Exercise[],
    routines: Routine[],
    groups: string[],
    tombstones: { exercises: Record<string, Tombstone>; routines: Record<string, Tombstone> },
    previousRemote: PulledData
  ): Promise<void> {
    const batch = writeBatch(this.db);

    exercises.forEach((exercise) => {
      batch.set(doc(this.exercisesRef(uid), exercise.id), exercise);
    });

    routines.forEach((routine) => {
      batch.set(doc(this.routinesRef(uid), routine.id), routine);
    });

    batch.set(this.groupsDoc(uid), { items: groups });
    batch.set(this.tombstonesDoc(uid), tombstones);

    const mergedExerciseIds = new Set(exercises.map((e) => e.id));
    previousRemote.exercises.forEach((exercise) => {
      if (!mergedExerciseIds.has(exercise.id) && tombstones.exercises[exercise.id]) {
        batch.delete(doc(this.exercisesRef(uid), exercise.id));
      }
    });

    const mergedRoutineIds = new Set(routines.map((r) => r.id));
    previousRemote.routines.forEach((routine) => {
      if (!mergedRoutineIds.has(routine.id) && tombstones.routines[routine.id]) {
        batch.delete(doc(this.routinesRef(uid), routine.id));
      }
    });

    await batch.commit();
  }
}
