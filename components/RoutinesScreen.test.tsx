import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { RoutinesScreen } from './RoutinesScreen';
import { Exercise, Routine } from '../types';
import { t } from '../utils/translations';

const exercises: Exercise[] = [
  {
    id: 'ex1',
    name: 'Bench Press',
    muscleGroup: 'Pecho',
    logs: [
      { date: '2026-01-10', weight: 60, reps: 8 },
      { date: '2026-01-20', weight: 70, reps: 10 },
    ],
  },
  {
    id: 'ex2',
    name: 'Squat',
    muscleGroup: 'Pierna',
    logs: [],
  },
];

const routines: Routine[] = [
  {
    id: 'r1',
    name: 'Push Day',
    exercises: [{ exerciseId: 'ex1', sets: 3, reps: 10, dropset: false }],
  },
  {
    id: 'r2',
    name: 'Leg Day',
    exercises: [{ exerciseId: 'ex2', sets: 4, reps: 12, dropset: true }],
  },
];

const defaultProps = {
  routines,
  exercises,
  onSaveRoutine: vi.fn(),
  onDeleteRoutine: vi.fn(),
  onLogExercise: vi.fn(),
};

describe('RoutinesScreen', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // --- List view ---

  it('renders all routines in the list', () => {
    render(<RoutinesScreen {...defaultProps} />);
    expect(screen.getByText('Push Day')).toBeTruthy();
    expect(screen.getByText('Leg Day')).toBeTruthy();
  });

  it('shows empty state when there are no routines', () => {
    render(<RoutinesScreen {...defaultProps} routines={[]} />);
    expect(screen.getByText(t.labels.noRoutines)).toBeTruthy();
  });

  it('shows each routine exercise count', () => {
    render(<RoutinesScreen {...defaultProps} />);
    const counts = screen.getAllByText(`1 ${t.labels.exercises}`);
    expect(counts).toHaveLength(2);
  });

  // --- Create modal ---

  it('opens create modal when FAB is clicked', async () => {
    render(<RoutinesScreen {...defaultProps} />);
    const fab = screen.getByRole('button', { name: t.labels.newRoutine });
    fireEvent.click(fab);
    expect(await screen.findByText(t.labels.newRoutine, { selector: 'h2' })).toBeTruthy();
  });

  it('calls onSaveRoutine with a new routine when saved', async () => {
    const onSaveRoutine = vi.fn();
    render(<RoutinesScreen {...defaultProps} onSaveRoutine={onSaveRoutine} />);

    fireEvent.click(screen.getByRole('button', { name: t.labels.newRoutine }));

    const nameInput = await screen.findByPlaceholderText(t.labels.routineName);
    fireEvent.change(nameInput, { target: { value: 'My Routine' } });

    fireEvent.click(screen.getByText('Bench Press'));

    fireEvent.click(screen.getByRole('button', { name: t.actions.save }));

    await waitFor(() => {
      expect(onSaveRoutine).toHaveBeenCalledOnce();
      const saved = onSaveRoutine.mock.calls[0][0] as Routine;
      expect(saved.name).toBe('My Routine');
      expect(saved.exercises[0].exerciseId).toBe('ex1');
      expect(saved.exercises[0].sets).toBe(3);
      expect(saved.exercises[0].reps).toBe(10);
      expect(saved.exercises[0].dropset).toBe(false);
    });
  });

  it('does not call onSaveRoutine when name is empty', async () => {
    const onSaveRoutine = vi.fn();
    render(<RoutinesScreen {...defaultProps} onSaveRoutine={onSaveRoutine} />);

    fireEvent.click(screen.getByRole('button', { name: t.labels.newRoutine }));
    await screen.findByText(t.labels.newRoutine, { selector: 'h2' });

    const saveBtn = screen.getByRole('button', { name: t.actions.save });
    expect((saveBtn as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(saveBtn);
    expect(onSaveRoutine).not.toHaveBeenCalled();
  });

  // --- Edit modal (via swipe action button) ---

  it('opens edit modal pre-filled with routine data when edit button is clicked', async () => {
    render(<RoutinesScreen {...defaultProps} />);

    const editButtons = screen.getAllByRole('button', { name: t.actions.edit });
    fireEvent.click(editButtons[0]);

    const nameInput = await screen.findByDisplayValue('Push Day');
    expect(nameInput).toBeTruthy();
  });

  it('calls onSaveRoutine with updated routine when editing', async () => {
    const onSaveRoutine = vi.fn();
    render(<RoutinesScreen {...defaultProps} onSaveRoutine={onSaveRoutine} />);

    const editButtons = screen.getAllByRole('button', { name: t.actions.edit });
    fireEvent.click(editButtons[0]);

    const nameInput = await screen.findByDisplayValue('Push Day');
    fireEvent.change(nameInput, { target: { value: 'Push Day Updated' } });
    fireEvent.click(screen.getByRole('button', { name: t.actions.save }));

    await waitFor(() => {
      expect(onSaveRoutine).toHaveBeenCalledOnce();
      const saved = onSaveRoutine.mock.calls[0][0] as Routine;
      expect(saved.id).toBe('r1');
      expect(saved.name).toBe('Push Day Updated');
    });
  });

  // --- Delete (via swipe action button) ---

  it('calls onDeleteRoutine after confirmation', async () => {
    const onDeleteRoutine = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<RoutinesScreen {...defaultProps} onDeleteRoutine={onDeleteRoutine} />);

    const deleteButtons = screen.getAllByRole('button', { name: t.actions.delete });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(onDeleteRoutine).toHaveBeenCalledWith('r1');
    });
  });

  it('does not call onDeleteRoutine when confirmation is cancelled', async () => {
    const onDeleteRoutine = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<RoutinesScreen {...defaultProps} onDeleteRoutine={onDeleteRoutine} />);

    const deleteButtons = screen.getAllByRole('button', { name: t.actions.delete });
    fireEvent.click(deleteButtons[0]);

    expect(onDeleteRoutine).not.toHaveBeenCalled();
  });

  // --- Detail view ---

  it('navigates to detail view when a routine card is clicked', async () => {
    render(<RoutinesScreen {...defaultProps} />);
    fireEvent.click(screen.getByText('Push Day'));
    expect(await screen.findByText('Bench Press')).toBeTruthy();
  });

  it('shows prescription info (sets x reps) in detail view', async () => {
    render(<RoutinesScreen {...defaultProps} />);
    fireEvent.click(screen.getByText('Push Day'));
    expect(await screen.findByText('3×10')).toBeTruthy();
  });

  it('shows dropset badge when dropset is enabled', async () => {
    render(<RoutinesScreen {...defaultProps} />);
    fireEvent.click(screen.getByText('Leg Day'));
    expect(await screen.findByText(t.labels.dropset)).toBeTruthy();
  });

  it('prefills log form with latest log values', async () => {
    render(<RoutinesScreen {...defaultProps} />);
    fireEvent.click(screen.getByText('Push Day'));

    const weightInput = await screen.findByDisplayValue('70');
    expect(weightInput).toBeTruthy();
    const repsInput = screen.getByDisplayValue('10');
    expect(repsInput).toBeTruthy();
  });

  it('calls onLogExercise with correct values', async () => {
    const onLogExercise = vi.fn();
    render(<RoutinesScreen {...defaultProps} onLogExercise={onLogExercise} />);

    fireEvent.click(screen.getByText('Push Day'));

    const weightInput = await screen.findByDisplayValue('70');
    fireEvent.change(weightInput, { target: { value: '75' } });

    const logButton = screen.getByRole('button', { name: t.actions.log });
    fireEvent.click(logButton);

    await waitFor(() => {
      expect(onLogExercise).toHaveBeenCalledWith('ex1', 75, 10);
    });
  });

  it('returns to routine list from detail view', async () => {
    render(<RoutinesScreen {...defaultProps} />);
    fireEvent.click(screen.getByText('Push Day'));
    await screen.findByText('Bench Press');

    fireEvent.click(screen.getByText(`← ${t.labels.routines}`));
    expect(await screen.findByText('Leg Day')).toBeTruthy();
  });
});
