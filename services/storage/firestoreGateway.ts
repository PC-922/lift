import {
  Firestore,
  collection,
  doc,
  getDocFromServer,
  getDocsFromServer,
  onSnapshot,
  setDoc,
  serverTimestamp,
  Timestamp,
  updateDoc,
  writeBatch,
  SetOptions,
} from 'firebase/firestore';
import { Exercise, Routine, Tombstone } from '../../types';

export interface PulledData {
  exercises: Exercise[];
  routines: Routine[];
  groups: string[];
  tombstones: { exercises: Record<string, Tombstone>; routines: Record<string, Tombstone> };
}

export interface SyncStatusSnapshot {
  hasPendingWrites: boolean;
  fromCache: boolean;
}

function toIso(date: Timestamp | string | undefined | null): string | undefined {
  if (!date) return undefined;
  if (typeof date === 'string') return date;
  if (date instanceof Timestamp) return date.toDate().toISOString();
  return undefined;
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

  private normalizeExercise(data: Exercise): Exercise {
    return {
      ...data,
      updatedAt: toIso(data.updatedAt as unknown as Timestamp) ?? data.updatedAt,
    };
  }

  private normalizeRoutine(data: Routine): Routine {
    return {
      ...data,
      updatedAt: toIso(data.updatedAt as unknown as Timestamp) ?? data.updatedAt,
    };
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
      exercises: exercisesSnapshot.docs
        .map((d) => this.normalizeExercise(d.data() as Exercise))
        .filter((e) => !e.deletedAt),
      routines: routinesSnapshot.docs
        .map((d) => this.normalizeRoutine(d.data() as Routine))
        .filter((r) => !r.deletedAt),
      groups: Array.isArray(groupsData?.items) ? (groupsData.items as string[]) : [],
      tombstones: {
        exercises: ((tombstonesData?.exercises as Record<string, Tombstone>) ?? {}),
        routines: ((tombstonesData?.routines as Record<string, Tombstone>) ?? {}),
      },
    };
  }

  async pushExercise(uid: string, exercise: Exercise): Promise<void> {
    await setDoc(
      doc(this.exercisesRef(uid), exercise.id),
      {
        ...exercise,
        ownerId: uid,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  async pushRoutine(uid: string, routine: Routine): Promise<void> {
    await setDoc(
      doc(this.routinesRef(uid), routine.id),
      {
        ...routine,
        ownerId: uid,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  async markExerciseDeleted(uid: string, id: string): Promise<void> {
    await updateDoc(doc(this.exercisesRef(uid), id), {
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  async markRoutineDeleted(uid: string, id: string): Promise<void> {
    await updateDoc(doc(this.routinesRef(uid), id), {
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  async pushGroups(uid: string, groups: string[]): Promise<void> {
    await setDoc(
      this.groupsDoc(uid),
      {
        items: groups,
        ownerId: uid,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  async pushTombstones(
    uid: string,
    tombstones: { exercises: Record<string, Tombstone>; routines: Record<string, Tombstone> }
  ): Promise<void> {
    await setDoc(
      this.tombstonesDoc(uid),
      {
        ...tombstones,
        ownerId: uid,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
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
    const setOptions: SetOptions = { merge: true };

    exercises.forEach((exercise) => {
      batch.set(
        doc(this.exercisesRef(uid), exercise.id),
        { ...exercise, ownerId: uid, updatedAt: serverTimestamp() },
        setOptions
      );
    });

    routines.forEach((routine) => {
      batch.set(
        doc(this.routinesRef(uid), routine.id),
        { ...routine, ownerId: uid, updatedAt: serverTimestamp() },
        setOptions
      );
    });

    batch.set(this.groupsDoc(uid), { items: groups, ownerId: uid, updatedAt: serverTimestamp() }, setOptions);
    batch.set(this.tombstonesDoc(uid), { ...tombstones, ownerId: uid, updatedAt: serverTimestamp() }, setOptions);

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

  subscribe(
    uid: string,
    onData: (data: PulledData) => void,
    onStatus: (status: SyncStatusSnapshot) => void
  ): () => void {
    let latestExercises: Record<string, Exercise> = {};
    let latestRoutines: Record<string, Routine> = {};
    let latestGroups: string[] = [];
    let latestTombstones: { exercises: Record<string, Tombstone>; routines: Record<string, Tombstone> } = {
      exercises: {},
      routines: {},
    };

    const emit = () => {
      onData({
        exercises: Object.values(latestExercises).filter((e) => !e.deletedAt),
        routines: Object.values(latestRoutines).filter((r) => !r.deletedAt),
        groups: latestGroups,
        tombstones: latestTombstones,
      });
    };

    const withMetadata = (snapshot: { metadata: { hasPendingWrites: boolean; fromCache: boolean } }) => {
      onStatus({
        hasPendingWrites: snapshot.metadata.hasPendingWrites,
        fromCache: snapshot.metadata.fromCache,
      });
    };

    const unsubscribeExercises = onSnapshot(
      this.exercisesRef(uid),
      { includeMetadataChanges: true },
      (snapshot) => {
        latestExercises = {};
        snapshot.docs.forEach((d) => {
          latestExercises[d.id] = this.normalizeExercise(d.data() as Exercise);
        });
        withMetadata(snapshot);
        emit();
      },
      (error) => {
        console.error('Exercises listener error', error);
      }
    );

    const unsubscribeRoutines = onSnapshot(
      this.routinesRef(uid),
      { includeMetadataChanges: true },
      (snapshot) => {
        latestRoutines = {};
        snapshot.docs.forEach((d) => {
          latestRoutines[d.id] = this.normalizeRoutine(d.data() as Routine);
        });
        withMetadata(snapshot);
        emit();
      },
      (error) => {
        console.error('Routines listener error', error);
      }
    );

    const unsubscribeGroups = onSnapshot(
      this.groupsDoc(uid),
      { includeMetadataChanges: true },
      (snapshot) => {
        const data = snapshot.data();
        latestGroups = Array.isArray(data?.items) ? (data.items as string[]) : [];
        withMetadata(snapshot);
        emit();
      },
      (error) => {
        console.error('Groups listener error', error);
      }
    );

    const unsubscribeTombstones = onSnapshot(
      this.tombstonesDoc(uid),
      { includeMetadataChanges: true },
      (snapshot) => {
        const data = snapshot.data();
        latestTombstones = {
          exercises: (data?.exercises as Record<string, Tombstone>) ?? {},
          routines: (data?.routines as Record<string, Tombstone>) ?? {},
        };
        withMetadata(snapshot);
        emit();
      },
      (error) => {
        console.error('Tombstones listener error', error);
      }
    );

    return () => {
      unsubscribeExercises();
      unsubscribeRoutines();
      unsubscribeGroups();
      unsubscribeTombstones();
    };
  }
}
