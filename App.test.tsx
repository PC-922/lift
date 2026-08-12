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

const noop = vi.fn(() => Promise.resolve());

vi.mock('./services/storageService', () => ({
  makeId: (prefix: string) => `${prefix}_id`,
  createDataStore: vi.fn(),
}));

vi.mock('./hooks/useAppData', () => ({
  AppDataProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAppData: () => ({
    exercises: [],
    muscleGroups: ['Pecho'],
    routines: [],
    workouts: [],
    groupSortPreference: { field: 'progress', direction: 'desc' },
    isLoading: false,
    syncStatus: null,
    saveExercise: noop,
    deleteExercise: noop,
    updateExerciseDetails: noop,
    updateExerciseNote: noop,
    updateExerciseLog: noop,
    deleteExerciseLog: noop,
    deleteAllLogs: noop,
    deleteAllLogsExceptLatest: noop,
    logSession: noop,
    addMuscleGroup: noop,
    deleteMuscleGroup: noop,
    renameMuscleGroup: noop,
    saveGroupSortPreference: noop,
    saveRoutine: noop,
    deleteRoutine: noop,
    reorderRoutine: noop,
    reorderRoutineExercise: noop,
    saveWorkout: noop,
    deleteWorkout: noop,
    finishWorkout: noop,
    exportData: vi.fn(() => Promise.resolve('{}')),
    importData: vi.fn(() => Promise.resolve(true)),
    resetData: noop,
  }),
}));

vi.mock('./services/preferencesService', () => ({
  preferencesService: {
    getDefaultScreen: () => 'home',
    subscribe: () => () => undefined,
    getPrefs: () => ({ onboardingDone: false, language: null, defaultScreen: 'home', authMode: 'guest' }),
    savePrefs: () => undefined,
    getLastUid: () => 'test_uid',
    setLastUid: () => undefined,
  },
  AuthMode: undefined,
}));

vi.mock('./hooks/useToast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
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
    expect(screen.getByRole('heading', { name: 'LIFT' })).toBeTruthy();
    const list = container.querySelector('[data-testid="exercise-list"]');

    await waitFor(() => {
      expect(list).toBeTruthy();
      expect(newExerciseButton.compareDocumentPosition(list as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(addGroupButton.compareDocumentPosition(list as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });
});
