import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, describe, it, expect, vi } from 'vitest';
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

vi.mock('./hooks/useAppData', () => ({
  AppDataProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAppData: () => ({
    exercises: [],
    muscleGroups: ['Pecho'],
    routines: [],
    workouts: [],
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

vi.mock('./hooks/useAuth', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({ user: { uid: 'test_uid' }, phase: 'authenticated', fallbackUid: null }),
}));

vi.mock('./hooks/useToast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const workoutSession = {
  activeWorkout: null as { id: string; name: string; startedAt: string; exercises: never[] } | null,
  currentIndex: 0,
  startWorkout: vi.fn(),
  logSet: vi.fn(),
  removeSet: vi.fn(),
  restoreSet: vi.fn(),
  nextExercise: vi.fn(),
  prevExercise: vi.fn(),
  addExercise: vi.fn(),
  replaceCurrentExercise: vi.fn(),
  removeExercise: vi.fn(),
  finish: vi.fn(),
  cancel: vi.fn(),
};

vi.mock('./hooks/useWorkoutSession', () => ({
  WorkoutSessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useWorkoutSession: () => workoutSession,
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
  afterEach(() => {
    workoutSession.activeWorkout = null;
  });

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

  it('does not trap full-screen mobile overlays inside a transformed main container', () => {
    const { container } = render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    expect(container.querySelector('main')?.className).not.toContain('animate-slideUp');
  });

  it('shows a clear resume control for a saved workout outside the workout route', async () => {
    workoutSession.activeWorkout = {
      id: 'draft',
      name: 'Push day',
      startedAt: '2026-09-24T10:00:00.000Z',
      exercises: [],
    };

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    const resume = await screen.findByRole('button', { name: /Resume workout/i });
    expect(resume).toBeTruthy();
    expect(resume.className).toContain('w-full');
  });
});
