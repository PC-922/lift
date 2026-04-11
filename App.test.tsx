import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';

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
    getExercises: () => [],
    getMuscleGroups: () => ['Pecho'],
    getRoutines: () => [],
    saveExercise: vi.fn(),
    logSession: vi.fn(),
    updateExerciseNote: vi.fn(),
    updateExerciseLog: vi.fn(),
    deleteExerciseLog: vi.fn(),
    deleteAllLogs: vi.fn(),
    deleteAllLogsExceptLatest: vi.fn(),
    updateExerciseDetails: vi.fn(),
    deleteExercise: vi.fn(),
    reorderRoutineExercise: vi.fn(),
    saveRoutine: vi.fn(),
    deleteRoutine: vi.fn(),
    exportData: vi.fn(() => '{}'),
    importData: vi.fn(() => true),
    addMuscleGroup: vi.fn(),
    renameMuscleGroup: vi.fn(),
    deleteMuscleGroup: vi.fn(),
  },
  makeId: (prefix: string) => `${prefix}_id`,
}));

vi.mock('./services/preferencesService', () => ({
  preferencesService: {
    getDefaultScreen: () => 'home',
    subscribe: () => () => undefined,
  },
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
    const { container } = render(<App />);

    expect(screen.getByRole('button', { name: /New Exercise/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Add Group/i })).toBeTruthy();

    const newExerciseButton = screen.getByRole('button', { name: /New Exercise/i });
    const addGroupButton = screen.getByRole('button', { name: /Add Group/i });
    const list = container.querySelector('[data-testid="exercise-list"]');

    expect(list).toBeTruthy();
    expect(newExerciseButton.compareDocumentPosition(list as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(addGroupButton.compareDocumentPosition(list as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
