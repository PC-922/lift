import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authService } from './authService';
import { preferencesService } from './preferencesService';

vi.mock('./firebase', () => ({
  isFirebaseAvailable: vi.fn(() => false),
  auth: null,
}));

describe('authService', () => {
  beforeEach(() => {
    preferencesService.savePrefs({ authMode: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('notifies listeners when continuing as guest', () => {
    const listener = vi.fn();
    authService.subscribe(listener);
    authService.continueAsGuest();
    expect(listener).toHaveBeenLastCalledWith(null, 'guest');
  });

  it('notifies listeners when signing out', async () => {
    const listener = vi.fn();
    authService.subscribe(listener);
    authService.continueAsGuest();
    listener.mockClear();
    await authService.signOut();
    expect(listener).toHaveBeenLastCalledWith(null, null);
  });

  it('falls back to local google mode when Firebase is not configured', async () => {
    const listener = vi.fn();
    authService.subscribe(listener);
    const user = await authService.signInWithGoogle();
    expect(user).toBeNull();
    expect(listener).toHaveBeenLastCalledWith(null, 'google');
  });

  it('returns stored mode on initial subscription when Firebase is unavailable', () => {
    vi.spyOn(preferencesService, 'getPrefs').mockReturnValue({
      onboardingDone: true,
      language: null,
      defaultScreen: null,
      authMode: 'guest',
    } as ReturnType<typeof preferencesService.getPrefs>);
    const listener = vi.fn();
    authService.subscribe(listener);
    expect(listener).toHaveBeenCalledWith(null, 'guest');
  });
});
