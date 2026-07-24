import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import App from './App';

vi.stubGlobal('scrollTo', vi.fn());

vi.stubGlobal('matchMedia', () => ({
  matches: true,
  media: '',
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

vi.mock('./services/storageService', () => ({
  storageManager: {
    getExercises: () => Promise.resolve([]),
    getMuscleGroups: () => Promise.resolve(['Pecho']),
    getRoutines: () => Promise.resolve([]),
    saveExercise: vi.fn(() => Promise.resolve()),
    logSession: vi.fn(() => Promise.resolve()),
    updateExerciseNote: vi.fn(() => Promise.resolve()),
    updateExerciseLog: vi.fn(() => Promise.resolve()),
    deleteExerciseLog: vi.fn(() => Promise.resolve()),
    deleteAllLogs: vi.fn(() => Promise.resolve()),
    deleteAllLogsExceptLatest: vi.fn(() => Promise.resolve()),
    updateExerciseDetails: vi.fn(() => Promise.resolve()),
    deleteExercise: vi.fn(() => Promise.resolve()),
    reorderRoutine: vi.fn(() => Promise.resolve()),
    reorderRoutineExercise: vi.fn(() => Promise.resolve()),
    saveRoutine: vi.fn(() => Promise.resolve()),
    deleteRoutine: vi.fn(() => Promise.resolve()),
    exportData: vi.fn(() => Promise.resolve('{}')),
    importData: vi.fn(() => Promise.resolve(true)),
    addMuscleGroup: vi.fn(() => Promise.resolve()),
    renameMuscleGroup: vi.fn(() => Promise.resolve()),
    deleteMuscleGroup: vi.fn(() => Promise.resolve()),
    resetData: vi.fn(() => Promise.resolve()),
  },
  makeId: (prefix: string) => `${prefix}_id`,
  setStorageUser: vi.fn(),
}));

vi.mock('./services/preferencesService', () => ({
  preferencesService: {
    getDefaultScreen: () => 'home',
    subscribe: () => () => undefined,
    getPrefs: () => ({ onboardingDone: false, language: null, defaultScreen: 'home', authMode: 'guest' }),
    savePrefs: () => undefined,
  },
  AuthMode: undefined,
}));

vi.mock('./hooks/useToast', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('./utils/translations', async () => {
  const actual = await vi.importActual<typeof import('./utils/translations')>('./utils/translations');
  return {
    ...actual,
    useTranslations: () => actual.t,
    getTranslatedGroupName: (group: string) => group,
  };
});

vi.mock('./components/BottomNav', () => ({
  BottomNav: () => null,
}));

vi.mock('./components/SettingsScreen', () => ({
  SettingsScreen: () => null,
}));

vi.mock('./components/InsightsScreen', () => ({
  InsightsScreen: () => null,
}));

vi.mock('./components/RoutinesScreen', () => ({
  RoutinesScreen: () => null,
}));

vi.mock('./components/ExerciseDetail', () => ({
  ExerciseDetail: () => null,
}));

vi.mock('./components/ExerciseList', () => ({
  ExerciseList: () => <div data-testid="exercise-list" />,
}));

vi.mock('./components/Modal', () => ({
  Modal: ({ children, open }: { children: React.ReactNode; open: boolean }) => (open ? <div>{children}</div> : null),
}));

vi.mock('./components/ConfirmModal', () => ({
  default: () => null,
}));

vi.mock('./components/PromptModal', () => ({
  default: () => null,
}));

describe('App home layout', () => {
  it('renders the home actions before the list', async () => {
    const { container } = render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    const newExerciseButton = await screen.findByRole('button', { name: /New Exercise/i });
    const addGroupButton = await screen.findByRole('button', { name: /Add Group/i });
    const list = container.querySelector('[data-testid="exercise-list"]');

    await waitFor(() => {
      expect(list).toBeTruthy();
      expect(newExerciseButton.compareDocumentPosition(list as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(addGroupButton.compareDocumentPosition(list as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });
});
