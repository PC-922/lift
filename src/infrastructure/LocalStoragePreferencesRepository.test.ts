import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { localStoragePreferencesRepository } from './LocalStoragePreferencesRepository';

const mockStorage: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => mockStorage[key] || null),
  setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value; }),
  removeItem: vi.fn((key: string) => { delete mockStorage[key]; }),
  clear: vi.fn(() => { Object.keys(mockStorage).forEach((key) => delete mockStorage[key]); }),
  length: 0,
  key: vi.fn((index: number) => Object.keys(mockStorage)[index] || null),
});

describe('localStoragePreferencesRepository', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('saves and retrieves language and default screen preferences', () => {
    localStoragePreferencesRepository.setLanguage('en');
    localStoragePreferencesRepository.setDefaultScreen('routines');

    expect(localStoragePreferencesRepository.getLanguage()).toBe('en');
    expect(localStoragePreferencesRepository.getDefaultScreen()).toBe('routines');
  });

  it('creates one stable device-local profile without Firebase', () => {
    const profileId = localStoragePreferencesRepository.getLocalProfileId();

    expect(profileId).toMatch(/^local_/);
    expect(localStoragePreferencesRepository.getLocalProfileId()).toBe(profileId);
  });

  it('notifies subscribers when preferences are updated', () => {
    const listener = vi.fn();
    const unsubscribe = localStoragePreferencesRepository.subscribe(listener);

    localStoragePreferencesRepository.setLanguage('es');
    localStoragePreferencesRepository.setDefaultScreen('insights');

    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('still notifies subscribers when localStorage setItem fails', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota exceeded');
    });
    const listener = vi.fn();
    const unsubscribe = localStoragePreferencesRepository.subscribe(listener);

    expect(() => localStoragePreferencesRepository.setLanguage('en')).not.toThrow();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    setItemSpy.mockRestore();
  });
});