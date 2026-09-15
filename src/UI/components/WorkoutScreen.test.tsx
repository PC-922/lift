import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { WorkoutScreen } from './WorkoutScreen';
import { WorkoutSessionProvider } from '../hooks/useWorkoutSession';
import { RestTimerProvider } from '../hooks/useRestTimer';
import { t } from '../utils/translations';
import { ApplicationProvider, type ApplicationServices } from '../ApplicationProvider';

const exercises = [
  { id: 'ex1', name: 'Bench Press', muscleGroup: 'Pecho', logs: [{ date: '2026-01-01', weight: 60, reps: 8 }] },
  { id: 'ex2', name: 'Squat', muscleGroup: 'Pierna', logs: [] },
];

const routines = [
  {
    id: 'r1',
    name: 'Push Day',
    days: [
      {
        id: 'd1',
        name: 'Día 1',
        exercises: [{ exerciseId: 'ex1', sets: 3, reps: '10', dropset: false, toFailure: false, restSeconds: 90 }],
      },
    ],
  },
];

const finishWorkout = vi.fn((_workout: unknown) => Promise.resolve());
const deleteWorkout = vi.fn(() => Promise.resolve());
const showToast = vi.fn();

vi.mock('../hooks/useAppData', () => ({
  useAppData: () => ({
    exercises,
    routines,
    workouts: [],
    finishWorkout,
    deleteWorkout,
  }),
}));

vi.mock('../hooks/useToast', () => ({
  useToast: () => ({ showToast }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const services: ApplicationServices = {
  authentication: {
    signInWithGoogle: async () => ({ user: null, isNewUser: false }),
    continueAsGuest: async () => ({ success: false }),
    signOut: async () => undefined,
    subscribe: () => () => undefined,
  },
  preferences: {
    getPrefs: () => ({ onboardingDone: false, language: null, defaultScreen: null, authMode: null, lastUid: null }),
    savePrefs: vi.fn(), getLanguage: () => null, setLanguage: vi.fn(), getDefaultScreen: () => null,
    setDefaultScreen: vi.fn(), isOnboardingDone: () => false, markOnboardingDone: vi.fn(),
    getLastUid: () => null, setLastUid: vi.fn(), subscribe: () => () => undefined,
  },
  workoutDrafts: { load: () => null, save: vi.fn() },
  trainingRepository: () => { throw new Error('Unused in this test'); },
  ids: { generate: (prefix) => `${prefix}_id` },
  clock: { now: () => '2026-09-09T10:00:00.000Z', today: () => '2026-09-09' },
};

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <ApplicationProvider services={services}>
      <RestTimerProvider>
        <WorkoutSessionProvider>{ui}</WorkoutSessionProvider>
      </RestTimerProvider>
    </ApplicationProvider>
  );

const WorkoutNavigationHarness: React.FC = () => {
  const [showWorkout, setShowWorkout] = React.useState(true);
  return (
    <>
      <button onClick={() => setShowWorkout((value) => !value)}>Toggle menu</button>
      {showWorkout ? <WorkoutScreen /> : <p>Another menu</p>}
    </>
  );
};

describe('WorkoutScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('shows free workout, routines and empty history state', () => {
    renderWithProviders(<WorkoutScreen />);

    expect(screen.getByText(t.labels.freeWorkout)).toBeTruthy();
    expect(screen.getByText('Push Day')).toBeTruthy();
    expect(screen.getByText(t.labels.noWorkouts)).toBeTruthy();
  });

  it('runs a free workout: add exercise, record set, rest timer and finish', async () => {
    renderWithProviders(<WorkoutScreen />);

    fireEvent.click(screen.getByText(t.labels.freeWorkout));

    fireEvent.click(screen.getByText(t.labels.addExercise));
    fireEvent.click(screen.getByText('Bench Press'));

    const recordSetButton = screen.getByText(t.labels.recordSet);
    const inputs = screen.getAllByPlaceholderText('0');
    fireEvent.change(inputs[0], { target: { value: '80' } });
    fireEvent.change(inputs[1], { target: { value: '10' } });

    fireEvent.click(recordSetButton);

    expect(screen.getByText('1:30')).toBeTruthy();

    fireEvent.click(screen.getByText(t.labels.restSkip));

    expect(screen.getByText('80 × 10')).toBeTruthy();

    fireEvent.click(screen.getByText(t.labels.finishWorkout));
    fireEvent.click(screen.getByText(t.labels.confirmFinish));

    await waitFor(() => {
      expect(finishWorkout).toHaveBeenCalledTimes(1);
    });
    const savedWorkout = finishWorkout.mock.calls[0][0] as { entries: { exerciseId: string; sets: unknown[] }[] };    expect(savedWorkout.entries).toHaveLength(1);
    expect(savedWorkout.entries[0]).toEqual({
      exerciseId: 'ex1',
      exerciseName: 'Bench Press',
      sets: [{ weight: 80, reps: 10 }],
    });
    expect(showToast).toHaveBeenCalledWith(t.labels.workoutSaved, 'achievement');

    await waitFor(() => {
      expect(screen.getByText(t.labels.freeWorkout)).toBeTruthy();
    });
  });

  it('starts a workout from a routine day with the target visible', async () => {
    renderWithProviders(<WorkoutScreen />);

    fireEvent.click(screen.getByText('Push Day'));
    fireEvent.click(screen.getByText('Día 1'));

    expect(screen.getByText('Bench Press')).toBeTruthy();
    expect(screen.getByText(new RegExp(`${t.labels.sets}:\\s*3`))).toBeTruthy();
    expect(screen.getByText(new RegExp(`${t.labels.reps}:\\s*10`))).toBeTruthy();
  });

  it('replaces the current exercise during a workout', async () => {
    renderWithProviders(<WorkoutScreen />);

    fireEvent.click(screen.getByText('Push Day'));
    fireEvent.click(screen.getByText('Día 1'));
    fireEvent.click(screen.getByText(t.labels.changeExercise));
    fireEvent.click(screen.getByText('Squat'));

    expect(screen.getByRole('heading', { name: 'Squat' })).toBeTruthy();
    expect(screen.getByText(new RegExp(`${t.labels.sets}:\\s*3`))).toBeTruthy();
  });

  it('keeps the rest timer when leaving and returning to the workout menu', () => {
    renderWithProviders(<WorkoutNavigationHarness />);
    fireEvent.click(screen.getByText(t.labels.freeWorkout));
    fireEvent.click(screen.getByText(t.labels.addExercise));
    fireEvent.click(screen.getByText('Bench Press'));
    const inputs = screen.getAllByPlaceholderText('0');
    fireEvent.change(inputs[0], { target: { value: '80.5' } });
    fireEvent.change(inputs[1], { target: { value: '10' } });
    fireEvent.click(screen.getByText(t.labels.recordSet));

    fireEvent.click(screen.getByText('Toggle menu'));
    expect(screen.getByText('Another menu')).toBeTruthy();
    fireEvent.click(screen.getByText('Toggle menu'));

    expect(screen.getByText('1:30')).toBeTruthy();
  });

  it('keeps the complete recording flow available in a compact mobile viewport', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 375 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 667 });
    renderWithProviders(<WorkoutScreen />);

    fireEvent.click(screen.getByText('Push Day'));
    fireEvent.click(screen.getByText('Día 1'));

    const title = screen.getByRole('heading', { name: 'Bench Press' });
    const player = title.closest('.fixed');
    expect(player?.className).toContain('h-[100dvh]');
    expect(player?.className).toContain('pt-[env(safe-area-inset-top)]');
    expect(screen.getByText(t.labels.weight)).toBeTruthy();
    expect(screen.getByText(t.labels.reps, { selector: 'label' })).toBeTruthy();
    expect(screen.getByRole('button', { name: t.labels.recordSet })).toBeTruthy();
    expect(screen.getByRole('button', { name: t.labels.finishWorkout })).toBeTruthy();
  });

  it('keeps the workout controls in a readable column on desktop', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });
    renderWithProviders(<WorkoutScreen />);

    fireEvent.click(screen.getByText('Push Day'));
    fireEvent.click(screen.getByText('Día 1'));

    expect(screen.getByRole('heading', { name: 'Bench Press' }).closest('.sm\\:max-w-md')).toBeTruthy();
    expect(screen.getByRole('button', { name: t.labels.recordSet })).toBeTruthy();
  });
});
