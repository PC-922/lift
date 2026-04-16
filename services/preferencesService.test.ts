import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { preferencesService } from './preferencesService';

const mockStorage: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => mockStorage[key] || null),
  setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value; }),
  removeItem: vi.fn((key: string) => { delete mockStorage[key]; }),
  clear: vi.fn(() => { Object.keys(mockStorage).forEach((key) => delete mockStorage[key]); }),
  length: 0,
  key: vi.fn((index: number) => Object.keys(mockStorage)[index] || null),
});

describe('preferencesService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('saves and retrieves language and default screen preferences', () => {
    preferencesService.setLanguage('en');
    preferencesService.setDefaultScreen('routines');

    expect(preferencesService.getLanguage()).toBe('en');
    expect(preferencesService.getDefaultScreen()).toBe('routines');
  });

  it('notifies subscribers when preferences are updated', () => {
    const listener = vi.fn();
    const unsubscribe = preferencesService.subscribe(listener);

    preferencesService.setLanguage('es');
    preferencesService.setDefaultScreen('insights');

    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('still notifies subscribers when localStorage setItem fails', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota exceeded');
    });
    const listener = vi.fn();
    const unsubscribe = preferencesService.subscribe(listener);

    expect(() => preferencesService.setLanguage('en')).not.toThrow();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    setItemSpy.mockRestore();
  });
});