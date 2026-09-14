import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SettingsScreen } from './SettingsScreen';
import { localStoragePreferencesRepository } from '../../infrastructure/LocalStoragePreferencesRepository';
import { AuthProvider } from '../hooks/useAuth';
import { ApplicationProvider, type ApplicationServices } from '../ApplicationProvider';

const mockStorage: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => mockStorage[key] || null),
  setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value; }),
  removeItem: vi.fn((key: string) => { delete mockStorage[key]; }),
  clear: vi.fn(() => { Object.keys(mockStorage).forEach((key) => delete mockStorage[key]); }),
  length: 0,
  key: vi.fn((index: number) => Object.keys(mockStorage)[index] || null),
});

vi.mock('../../infrastructure/firebase', () => ({
  isFirebaseAvailable: vi.fn(() => false),
  auth: null,
}));

vi.mock('../hooks/useToast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const defaultProps = {
  onExport: vi.fn(),
  onImport: vi.fn(async () => true),
  onResetData: vi.fn(() => Promise.resolve()),
};

const PREFS_KEY = 'lift_prefs_v1';

const services: ApplicationServices = {
  authentication: {
    signInWithGoogle: async () => ({ user: null, isNewUser: false }),
    continueAsGuest: async () => ({ success: false }),
    signOut: async () => undefined,
    subscribe: (listener) => { listener(null, null); return () => undefined; },
  },
  preferences: localStoragePreferencesRepository,
  workoutDrafts: { load: () => null, save: () => undefined },
  trainingRepository: () => { throw new Error('Unused in this test'); },
  ids: { generate: (prefix) => `${prefix}_id` },
  clock: { now: () => '2026-09-09T10:00:00.000Z', today: () => '2026-09-09' },
};

const renderWithRouter = (ui: React.ReactElement) => render(
  <ApplicationProvider services={services}>
    <BrowserRouter>
      <AuthProvider>{ui}</AuthProvider>
    </BrowserRouter>
  </ApplicationProvider>
);

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

    renderWithRouter(<SettingsScreen {...defaultProps} />);

    const selectors = screen.getAllByRole('combobox') as HTMLSelectElement[];
    expect(selectors).toHaveLength(2);
    expect(selectors[0].value).toBe('en');
    expect(selectors[1].value).toBe('routines');
  });

  it('updates language selection and persists it through the preferences repository', () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ language: 'en' }));

    renderWithRouter(<SettingsScreen {...defaultProps} />);

    const [languageSelect] = screen.getAllByRole('combobox') as HTMLSelectElement[];
    fireEvent.change(languageSelect, { target: { value: 'es' } });

    const [updatedLanguageSelect] = screen.getAllByRole('combobox') as HTMLSelectElement[];
    expect(updatedLanguageSelect.value).toBe('es');
    expect(localStoragePreferencesRepository.getLanguage()).toBe('es');
  });

  it('updates default screen selection and persists it through the preferences repository', () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ defaultScreen: 'home' }));

    renderWithRouter(<SettingsScreen {...defaultProps} />);

    const selectors = screen.getAllByRole('combobox') as HTMLSelectElement[];
    const defaultScreenSelect = selectors[1];
    fireEvent.change(defaultScreenSelect, { target: { value: 'insights' } });

    const updatedSelectors = screen.getAllByRole('combobox') as HTMLSelectElement[];
    expect(updatedSelectors[1].value).toBe('insights');
    expect(localStoragePreferencesRepository.getDefaultScreen()).toBe('insights');
  });
});
