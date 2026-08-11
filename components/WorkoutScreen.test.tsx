import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { WorkoutScreen } from './WorkoutScreen';
import { WorkoutSessionProvider } from '../hooks/useWorkoutSession';
import { RestTimerProvider } from '../hooks/useRestTimer';
import { t } from '../utils/translations';

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

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <RestTimerProvider>
      <WorkoutSessionProvider>{ui}</WorkoutSessionProvider>
    </RestTimerProvider>
  );

describe('WorkoutScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
    expect(savedWorkout.entries[0]).toEqual({ exerciseId: 'ex1', sets: [{ weight: 80, reps: 10 }] });
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
});
