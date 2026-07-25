import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface UserProfile {
  email: string;
  displayName: string | null;
  photoURL: string | null;
  createdAt: ReturnType<typeof serverTimestamp>;
  lastLoginAt: ReturnType<typeof serverTimestamp>;
}

export async function ensureUserProfile(user: { uid: string; email: string | null; displayName: string | null; photoURL: string | null }): Promise<void> {
  if (!db) return;

  try {
    const profileRef = doc(db, 'users', user.uid, 'profile', 'data');
    await setDoc(profileRef, {
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      lastLoginAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error('Failed to create user profile', error);
  }
}
