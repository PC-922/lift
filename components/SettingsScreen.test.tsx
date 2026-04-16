import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SettingsScreen } from './SettingsScreen';
import { preferencesService } from '../services/preferencesService';

const mockStorage: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => mockStorage[key] || null),
  setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value; }),
  removeItem: vi.fn((key: string) => { delete mockStorage[key]; }),
  clear: vi.fn(() => { Object.keys(mockStorage).forEach((key) => delete mockStorage[key]); }),
  length: 0,
  key: vi.fn((index: number) => Object.keys(mockStorage)[index] || null),
});

const defaultProps = {
  onExport: vi.fn(),
  onImport: vi.fn(() => true),
};

const PREFS_KEY = 'lift_prefs_v1';

describe('SettingsScreen selectors', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('renders selectors with persisted language and default screen values', () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ language: 'en', defaultScreen: 'routines' }));

    render(<SettingsScreen {...defaultProps} />);

    const selectors = screen.getAllByRole('combobox') as HTMLSelectElement[];
    expect(selectors).toHaveLength(2);
    expect(selectors[0].value).toBe('en');
    expect(selectors[1].value).toBe('routines');
  });

  it('updates language selection and persists it through preferencesService', () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ language: 'en' }));

    render(<SettingsScreen {...defaultProps} />);

    const [languageSelect] = screen.getAllByRole('combobox') as HTMLSelectElement[];
    fireEvent.change(languageSelect, { target: { value: 'es' } });

    const [updatedLanguageSelect] = screen.getAllByRole('combobox') as HTMLSelectElement[];
    expect(updatedLanguageSelect.value).toBe('es');
    expect(preferencesService.getLanguage()).toBe('es');
  });

  it('updates default screen selection and persists it through preferencesService', () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ defaultScreen: 'home' }));

    render(<SettingsScreen {...defaultProps} />);

    const selectors = screen.getAllByRole('combobox') as HTMLSelectElement[];
    const defaultScreenSelect = selectors[1];
    fireEvent.change(defaultScreenSelect, { target: { value: 'insights' } });

    const updatedSelectors = screen.getAllByRole('combobox') as HTMLSelectElement[];
    expect(updatedSelectors[1].value).toBe('insights');
    expect(preferencesService.getDefaultScreen()).toBe('insights');
  });
});