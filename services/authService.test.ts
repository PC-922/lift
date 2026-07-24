import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authService } from './authService';
import { preferencesService } from './preferencesService';

vi.mock('./firebase', () => ({
  isFirebaseAvailable: vi.fn(() => true),
  auth: {
    currentUser: null,
  },
}));

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  signInWithRedirect: vi.fn(),
  getRedirectResult: vi.fn(() => Promise.resolve(null)),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn((_auth, cb) => {
    cb(null);
    return vi.fn();
  }),
}));

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    preferencesService.savePrefs({ authMode: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses signInWithRedirect for Google login', async () => {
    const { signInWithRedirect } = await import('firebase/auth');

    await authService.signInWithGoogle();

    expect(signInWithRedirect).toHaveBeenCalled();
    expect(preferencesService.getPrefs().authMode).toBe('google');
  });

  it('captures redirect result on subscription', async () => {
    const { getRedirectResult } = await import('firebase/auth');
    const mockUser = { uid: '123', email: 'test@example.com' };
    vi.mocked(getRedirectResult).mockResolvedValue({ user: mockUser } as any);

    const listener = vi.fn();
    authService.subscribe(listener);

    // Esperar a la promesa
    await vi.waitFor(() => {
      expect(listener).toHaveBeenCalledWith(mockUser, 'google');
    });
  });

  it('notifies listeners when continuing as guest', () => {
    const listener = vi.fn();
    authService.subscribe(listener);
    authService.continueAsGuest();
    expect(listener).toHaveBeenLastCalledWith(null, 'guest');
  });
});
