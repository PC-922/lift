import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Workout } from '../../domain';
import { t } from '../utils/translations';
import { WorkoutHistory } from './WorkoutHistory';

const workout: Workout = {
  id: 'workout-1',
  name: 'Push day',
  startedAt: '2026-09-14T10:00:00.000Z',
  finishedAt: '2026-09-14T11:00:00.000Z',
  entries: [{ exerciseId: 'press', sets: [{ weight: 80, reps: 8 }, { weight: 75, reps: 10 }] }],
};

const saveWorkout = vi.fn(() => Promise.resolve());
const deleteWorkout = vi.fn(() => Promise.resolve());

vi.mock('../hooks/useAppData', () => ({
  useAppData: () => ({
    workouts: [workout],
    exercises: [
      { id: 'press', name: 'Bench press', muscleGroup: 'Chest', logs: [] },
      { id: 'fly', name: 'Fly', muscleGroup: 'Chest', logs: [] },
    ],
    saveWorkout,
    deleteWorkout,
    createWorkoutDraft: () => ({
      id: 'workout-new',
      name: '',
      startedAt: '2026-09-14T12:00:00.000Z',
      finishedAt: '2026-09-14T13:00:00.000Z',
      entries: [],
    }),
  }),
}));

describe('WorkoutHistory', () => {
  beforeEach(() => vi.clearAllMocks());

  it('opens a detailed workout and edits its duration and sets', async () => {
    render(<WorkoutHistory />);
    fireEvent.click(screen.getByRole('button', { name: /Push day/i }));

    expect(screen.getByText(t.labels.workoutDetails)).toBeTruthy();
    expect(screen.getByDisplayValue('80')).toBeTruthy();
    fireEvent.change(screen.getByLabelText(t.labels.durationMinutes), { target: { value: '90' } });
    fireEvent.change(screen.getByLabelText(`${t.labels.weight} 2`), { target: { value: '72.5' } });
    fireEvent.click(screen.getAllByLabelText(new RegExp(t.labels.removeSet))[0]);
    fireEvent.click(screen.getByRole('button', { name: t.actions.save }));

    await waitFor(() => expect(saveWorkout).toHaveBeenCalledWith(expect.objectContaining({
      id: 'workout-1',
      finishedAt: '2026-09-14T11:30:00.000Z',
      entries: [{ exerciseId: 'press', sets: [{ weight: 72.5, reps: 10 }] }],
    })));
  });

  it('creates and deletes workouts from the history', async () => {
    render(<WorkoutHistory />);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.labels.newWorkout) }));
    fireEvent.change(screen.getByLabelText(t.labels.workoutName), { target: { value: 'Leg day' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'fly' } });
    fireEvent.click(screen.getByRole('button', { name: t.labels.addSet }));
    fireEvent.click(screen.getByRole('button', { name: t.actions.save }));

    await waitFor(() => expect(saveWorkout).toHaveBeenCalledWith(expect.objectContaining({ name: 'Leg day' })));

    fireEvent.click(screen.getByRole('button', { name: /Push day/i }));
    fireEvent.click(screen.getByRole('button', { name: t.actions.delete }));
    fireEvent.click(screen.getByTestId('confirm-modal-confirm'));

    await waitFor(() => expect(deleteWorkout).toHaveBeenCalledWith('workout-1'));
  });
});
