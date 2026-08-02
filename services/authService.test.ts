import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authService } from './authService';
import { preferencesService } from './preferencesService';

const mockStorage: Record<string, string> = {};

vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => mockStorage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value; }),
  removeItem: vi.fn((key: string) => { delete mockStorage[key]; }),
  clear: vi.fn(() => { Object.keys(mockStorage).forEach((k) => delete mockStorage[k]); }),
  length: 0,
  key: vi.fn((index: number) => Object.keys(mockStorage)[index] ?? null),
});

vi.mock('./firebase', () => ({
  isFirebaseAvailable: vi.fn(() => true),
  auth: {
    currentUser: null,
  },
  db: null,
}));

vi.mock('./userProfileService', () => ({
  ensureUserProfile: vi.fn(() => Promise.resolve()),
}));

const mockNavigatorOnLine = vi.fn(() => true);
Object.defineProperty(window, 'navigator', {
  value: { onLine: true },
  writable: true,
  configurable: true,
});

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  signInAnonymously: vi.fn(),
  getRedirectResult: vi.fn(() => Promise.resolve(null)),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn((_auth, cb) => {
    cb(null);
    return vi.fn();
  }),
}));

describe('authService', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    preferencesService.savePrefs({ authMode: null });
    const firebase = await import('./firebase');
    vi.mocked(firebase.isFirebaseAvailable).mockReturnValue(true);
    Object.defineProperty(firebase.auth, 'currentUser', { value: null, configurable: true });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('uses signInWithPopup for Google login', async () => {
    const { signInWithPopup } = await import('firebase/auth');
    const mockUser = {
      uid: '123',
      email: 'test@example.com',
      metadata: {
        creationTime: '2024-01-01T00:00:00Z',
        lastSignInTime: '2024-01-02T00:00:00Z',
      },
    };
    vi.mocked(signInWithPopup).mockResolvedValue({ user: mockUser } as any);

    const result = await authService.signInWithGoogle();

    expect(signInWithPopup).toHaveBeenCalled();
    expect(result.user).toBe(mockUser);
    expect(result.isNewUser).toBe(false);
    expect(preferencesService.getPrefs().authMode).toBe('google');
  });

  it('detects new user when creationTime matches lastSignInTime', async () => {
    const { signInWithPopup } = await import('firebase/auth');
    const mockUser = {
      uid: '456',
      email: 'new@example.com',
      metadata: {
        creationTime: '2024-01-01T00:00:00Z',
        lastSignInTime: '2024-01-01T00:00:00Z',
      },
    };
    vi.mocked(signInWithPopup).mockResolvedValue({ user: mockUser } as any);

    const { ensureUserProfile } = await import('./userProfileService');

    const result = await authService.signInWithGoogle();

    expect(result.isNewUser).toBe(true);
    expect(ensureUserProfile).toHaveBeenCalledWith(mockUser);
  });

  it('uses signInWithPopup directly from an anonymous session', async () => {
    const { signInWithPopup } = await import('firebase/auth');
    const mockUser = {
      uid: 'google-uid',
      isAnonymous: false,
      metadata: {
        creationTime: '2024-01-01T00:00:00Z',
        lastSignInTime: '2024-01-02T00:00:00Z',
      },
    };
    vi.mocked(signInWithPopup).mockResolvedValue({ user: mockUser } as any);

    const authModule = await import('./firebase');
    vi.mocked(authModule.isFirebaseAvailable).mockReturnValue(true);
    Object.defineProperty(authModule, 'auth', { value: { currentUser: { uid: 'anonymous-uid', isAnonymous: true } }, configurable: true });

    const result = await authService.signInWithGoogle();

    expect(signInWithPopup).toHaveBeenCalled();
    expect(result.user).toBe(mockUser);
    expect(preferencesService.getPrefs().authMode).toBe('google');
  });

  it('returns an error when popup is blocked', async () => {
    const { signInWithPopup } = await import('firebase/auth');
    vi.mocked(signInWithPopup).mockRejectedValue({ code: 'auth/popup-blocked', message: 'Popup blocked' } as any);

    const result = await authService.signInWithGoogle();

    expect(signInWithPopup).toHaveBeenCalled();
    expect(result.error).toEqual({ code: 'auth/popup-blocked', message: 'Popup blocked' });
    expect(result.user).toBeNull();
    expect(result.isNewUser).toBe(false);
    expect(preferencesService.getPrefs().authMode).toBeNull();
  });

  it('returns an error when popup is closed by user', async () => {
    const { signInWithPopup } = await import('firebase/auth');
    vi.mocked(signInWithPopup).mockRejectedValue({ code: 'auth/popup-closed-by-user', message: 'Closed' } as any);

    const result = await authService.signInWithGoogle();

    expect(result.error?.code).toBe('auth/popup-closed-by-user');
    expect(result.user).toBeNull();
  });

  it('returns an error when popup request is cancelled', async () => {
    const { signInWithPopup } = await import('firebase/auth');
    vi.mocked(signInWithPopup).mockRejectedValue({ code: 'auth/cancelled-popup-request', message: 'Cancelled' } as any);

    const result = await authService.signInWithGoogle();

    expect(result.error?.code).toBe('auth/cancelled-popup-request');
    expect(result.user).toBeNull();
  });

  it('returns an error on non-recoverable popup errors', async () => {
    const { signInWithPopup } = await import('firebase/auth');
    const error = { code: 'auth/unauthorized-domain', message: 'Bad domain' };
    vi.mocked(signInWithPopup).mockRejectedValue(error);

    const result = await authService.signInWithGoogle();

    expect(result.error).toEqual(error);
    expect(result.user).toBeNull();
    expect(preferencesService.getPrefs().authMode).toBeNull();
  });

  it('captures redirect result on subscription', async () => {
    const { getRedirectResult } = await import('firebase/auth');
    const mockUser = { uid: '123', email: 'test@example.com' };
    vi.mocked(getRedirectResult).mockResolvedValue({ user: mockUser } as any);

    const listener = vi.fn();
    authService.subscribe(listener);

    await vi.waitFor(() => {
      expect(listener).toHaveBeenCalledWith(mockUser, 'google');
    });
  });

  it('notifies listeners when continuing as guest', async () => {
    const { signInAnonymously } = await import('firebase/auth');
    const mockUser = { uid: 'anon-1', isAnonymous: true };
    vi.mocked(signInAnonymously).mockResolvedValue({ user: mockUser } as any);

    const listener = vi.fn();
    authService.subscribe(listener);
    await authService.continueAsGuest();

    expect(signInAnonymously).toHaveBeenCalled();
    expect(listener).toHaveBeenLastCalledWith(mockUser, 'guest');
  });

  it('returns needsNetwork when continuing as guest offline', async () => {
    Object.defineProperty(window, 'navigator', { value: { onLine: false }, configurable: true });

    const result = await authService.continueAsGuest();

    expect(result.success).toBe(false);
    expect(result.needsNetwork).toBe(true);

    Object.defineProperty(window, 'navigator', { value: { onLine: true }, configurable: true });
  });

  it('returns to guest mode after signing out', async () => {
    const { signOut, signInAnonymously } = await import('firebase/auth');
    const mockUser = { uid: 'guest-uid', isAnonymous: true };
    vi.mocked(signInAnonymously).mockResolvedValue({ user: mockUser } as any);

    const listener = vi.fn();
    authService.subscribe(listener);

    await authService.signOut();

    expect(signOut).toHaveBeenCalled();
    expect(signInAnonymously).toHaveBeenCalled();
    expect(preferencesService.getPrefs().authMode).toBe('guest');
    expect(listener).toHaveBeenLastCalledWith(mockUser, 'guest');
  });
});
