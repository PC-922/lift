import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Authentication } from '../../domain/Authentication';
import type { PreferencesRepository } from '../../domain/PreferencesRepository';
import { ApplicationProvider, type ApplicationServices } from '../ApplicationProvider';
import { AuthProvider, useAuth } from './useAuth';

function createPreferences(lastUid: string | null): PreferencesRepository {
  return {
    getPrefs: () => ({ onboardingDone: true, language: null, defaultScreen: null, authMode: 'google', lastUid }),
    savePrefs: vi.fn(),
    getLanguage: () => null,
    setLanguage: vi.fn(),
    getDefaultScreen: () => null,
    setDefaultScreen: vi.fn(),
    isOnboardingDone: () => true,
    markOnboardingDone: vi.fn(),
    getLastUid: () => lastUid,
    setLastUid: vi.fn(),
    getLocalProfileId: () => 'local_test_profile',
    subscribe: () => () => undefined,
  };
}

function wrapper(authentication: Authentication, preferences: PreferencesRepository) {
  const services: ApplicationServices = {
    authentication,
    preferences,
    workoutDrafts: { load: () => null, save: vi.fn() },
    trainingRepository: () => { throw new Error('Unused'); },
    ids: { generate: () => 'id' },
    clock: { now: () => '2026-09-14T10:00:00.000Z', today: () => '2026-09-14' },
  };
  return ({ children }: { children: React.ReactNode }) => (
    <ApplicationProvider services={services}><AuthProvider>{children}</AuthProvider></ApplicationProvider>
  );
}

describe('useAuth', () => {
  it('keeps the local profile after a Google sync error', async () => {
    const authentication: Authentication = {
      signInWithGoogle: vi.fn(async () => ({
        user: null,
        isNewUser: false,
        error: { code: 'auth/network-request-failed', message: 'Offline' },
      })),
      signOut: vi.fn(),
      subscribe: vi.fn(() => () => undefined),
    };
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(authentication, createPreferences('cached-user')) });

    await act(async () => { await result.current.signInWithGoogle(); });

    expect(result.current.phase).toBe('authenticated');
    expect(result.current.localProfileId).toBe('local_test_profile');
    expect(result.current.user).toBeNull();
  });

  it('starts with a durable local profile when Firebase has no session', async () => {
    const authentication: Authentication = {
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      subscribe: vi.fn((callback) => { callback(null, null); return () => undefined; }),
    };
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(authentication, createPreferences(null)) });

    await act(async () => { await Promise.resolve(); });

    expect(result.current.localProfileId).toBe('local_test_profile');
    expect(result.current.phase).not.toBe('unauthenticated');
  });

  it('keeps the same local profile when sync is disconnected', async () => {
    let listener: ((user: import('../../domain/Authentication').AuthUser, mode: import('../../domain/PreferencesRepository').AuthMode) => void) | undefined;
    const authentication: Authentication = {
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(async () => { listener?.(null, null); }),
      subscribe: vi.fn((callback) => { listener = callback; callback({ uid: 'google-user', email: null, displayName: null, photoURL: null, isAnonymous: false }, 'google'); return () => undefined; }),
    };
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(authentication, createPreferences(null)) });

    await act(async () => { await result.current.signOut(); });

    expect(result.current.user).toBeNull();
    expect(result.current.localProfileId).toBe('local_test_profile');
  });

  it('stops waiting for a stalled Google request after twelve seconds', async () => {
    vi.useFakeTimers();
    const authentication: Authentication = {
      signInWithGoogle: vi.fn(() => new Promise(() => undefined)),
      signOut: vi.fn(),
      subscribe: vi.fn((callback) => {
        callback(null, null);
        return () => undefined;
      }),
    };
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(authentication, createPreferences('cached-user')) });
    let signInResult: Awaited<ReturnType<Authentication['signInWithGoogle']>> | undefined;

    act(() => {
      void result.current.signInWithGoogle().then((value) => { signInResult = value; });
      vi.advanceTimersByTime(12000);
    });
    await act(async () => { await Promise.resolve(); });

    expect(signInResult?.error?.code).toBe('auth/timeout');
    expect(result.current.phase).toBe('authenticated');
    vi.useRealTimers();
  });
});
