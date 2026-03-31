import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
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
    exercises: [{ exerciseId: 'ex1', sets: 3, reps: '10', dropset: false, toFailure: false }],
  },
  {
    id: 'r2',
    name: 'Leg Day',
    exercises: [{ exerciseId: 'ex2', sets: 4, reps: '12', dropset: true, toFailure: false }],
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
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
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
    await act(() => vi.runAllTimersAsync());
    expect(screen.getByText(t.labels.newRoutine, { selector: 'h2' })).toBeTruthy();
  });

  it('calls onSaveRoutine with a new routine when saved', async () => {
    const onSaveRoutine = vi.fn();
    render(<RoutinesScreen {...defaultProps} onSaveRoutine={onSaveRoutine} />);

    fireEvent.click(screen.getByRole('button', { name: t.labels.newRoutine }));
    await act(() => vi.runAllTimersAsync());

    const nameInput = screen.getByPlaceholderText(t.labels.routineName);
    fireEvent.change(nameInput, { target: { value: 'My Routine' } });

    fireEvent.click(screen.getByText('Bench Press'));

    fireEvent.click(screen.getByRole('button', { name: t.actions.save }));
    await act(() => vi.runAllTimersAsync());

    expect(onSaveRoutine).toHaveBeenCalledOnce();
    const saved = onSaveRoutine.mock.calls[0][0] as Routine;
    expect(saved.name).toBe('My Routine');
    expect(saved.exercises[0].exerciseId).toBe('ex1');
    expect(saved.exercises[0].sets).toBe(3);
    expect(saved.exercises[0].reps).toBe('10');
    expect(saved.exercises[0].dropset).toBe(false);
    expect(saved.exercises[0].toFailure).toBe(false);
  });

  it('does not call onSaveRoutine when name is empty', async () => {
    const onSaveRoutine = vi.fn();
    render(<RoutinesScreen {...defaultProps} onSaveRoutine={onSaveRoutine} />);

    fireEvent.click(screen.getByRole('button', { name: t.labels.newRoutine }));
    await act(() => vi.runAllTimersAsync());

    const saveBtn = screen.getByRole('button', { name: t.actions.save });
    expect((saveBtn as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(saveBtn);
    expect(onSaveRoutine).not.toHaveBeenCalled();
  });

  // --- Edit modal (via long-press ActionSheet) ---

  it('opens edit modal pre-filled with routine data when edit button is clicked', async () => {
    render(<RoutinesScreen {...defaultProps} />);

    const card = screen.getByText('Push Day').closest('div[class*="rounded-2xl"]')!;
    fireEvent.mouseDown(card);
    act(() => { vi.advanceTimersByTime(600); });
    await act(() => vi.runAllTimersAsync());

    const editBtn = screen.getByRole('button', { name: t.actions.edit });
    fireEvent.click(editBtn);

    const nameInput = screen.getByDisplayValue('Push Day');
    expect(nameInput).toBeTruthy();
  });

  it('calls onSaveRoutine with updated routine when editing', async () => {
    const onSaveRoutine = vi.fn();
    render(<RoutinesScreen {...defaultProps} onSaveRoutine={onSaveRoutine} />);

    const card = screen.getByText('Push Day').closest('div[class*="rounded-2xl"]')!;
    fireEvent.mouseDown(card);
    act(() => { vi.advanceTimersByTime(600); });
    await act(() => vi.runAllTimersAsync());

    const editBtn = screen.getByRole('button', { name: t.actions.edit });
    fireEvent.click(editBtn);

    const nameInput = screen.getByDisplayValue('Push Day');
    fireEvent.change(nameInput, { target: { value: 'Push Day Updated' } });
    fireEvent.click(screen.getByRole('button', { name: t.actions.save }));
    await act(() => vi.runAllTimersAsync());

    expect(onSaveRoutine).toHaveBeenCalledOnce();
    const saved = onSaveRoutine.mock.calls[0][0] as Routine;
    expect(saved.id).toBe('r1');
    expect(saved.name).toBe('Push Day Updated');
  });

  // --- Delete (via long-press ActionSheet) ---

  it('calls onDeleteRoutine after confirmation', async () => {
    const onDeleteRoutine = vi.fn();
    render(<RoutinesScreen {...defaultProps} onDeleteRoutine={onDeleteRoutine} />);

    const card = screen.getByText('Push Day').closest('div[class*="rounded-2xl"]')!;
    fireEvent.mouseDown(card);
    act(() => { vi.advanceTimersByTime(600); });
    await act(() => vi.runAllTimersAsync());

    const deleteBtn = screen.getByRole('button', { name: t.actions.delete });
    fireEvent.click(deleteBtn);
    await act(() => vi.runAllTimersAsync());

    const confirmButton = screen.getByTestId('confirm-modal-confirm');
    fireEvent.click(confirmButton);
    await act(() => vi.runAllTimersAsync());

    expect(onDeleteRoutine).toHaveBeenCalledWith('r1');
  });

  it('does not call onDeleteRoutine when confirmation is cancelled', async () => {
    const onDeleteRoutine = vi.fn();
    render(<RoutinesScreen {...defaultProps} onDeleteRoutine={onDeleteRoutine} />);

    const card = screen.getByText('Push Day').closest('div[class*="rounded-2xl"]')!;
    fireEvent.mouseDown(card);
    act(() => { vi.advanceTimersByTime(600); });
    await act(() => vi.runAllTimersAsync());

    const deleteBtn = screen.getByRole('button', { name: t.actions.delete });
    fireEvent.click(deleteBtn);
    await act(() => vi.runAllTimersAsync());

    const cancelButton = screen.getByRole('button', { name: t.actions.cancel });
    fireEvent.click(cancelButton);

    expect(onDeleteRoutine).not.toHaveBeenCalled();
  });

  // --- Detail view ---

  function clickRoutineCard(name: string) {
    const card = screen.getByText(name).closest('div[class*="rounded-2xl"]')!;
    fireEvent.mouseDown(card);
    fireEvent.mouseUp(card);
  }

  it('navigates to detail view when a routine card is clicked', async () => {
    render(<RoutinesScreen {...defaultProps} />);
    clickRoutineCard('Push Day');
    await act(() => vi.runAllTimersAsync());
    expect(screen.getByText('Bench Press')).toBeTruthy();
  });

  it('shows prescription info (sets x reps) in detail view', async () => {
    render(<RoutinesScreen {...defaultProps} />);
    clickRoutineCard('Push Day');
    await act(() => vi.runAllTimersAsync());
    expect(screen.getByText('3×10')).toBeTruthy();
  });

  it('shows dropset badge when dropset is enabled', async () => {
    render(<RoutinesScreen {...defaultProps} />);
    clickRoutineCard('Leg Day');
    await act(() => vi.runAllTimersAsync());
    expect(screen.getByText(t.labels.dropset)).toBeTruthy();
  });

  it('prefills log form with latest log values', async () => {
    render(<RoutinesScreen {...defaultProps} />);
    clickRoutineCard('Push Day');
    await act(() => vi.runAllTimersAsync());

    expect(screen.getByDisplayValue('70')).toBeTruthy();
    expect(screen.getByDisplayValue('10')).toBeTruthy();
  });

  it('calls onLogExercise with correct values', async () => {
    const onLogExercise = vi.fn();
    render(<RoutinesScreen {...defaultProps} onLogExercise={onLogExercise} />);

    clickRoutineCard('Push Day');
    await act(() => vi.runAllTimersAsync());

    const weightInput = screen.getByDisplayValue('70');
    fireEvent.change(weightInput, { target: { value: '75' } });

    const logButton = screen.getByRole('button', { name: t.actions.log });
    fireEvent.click(logButton);
    await act(() => vi.runAllTimersAsync());

    expect(onLogExercise).toHaveBeenCalledWith('ex1', 75, 10);
  });

  it('returns to routine list from detail view', async () => {
    render(<RoutinesScreen {...defaultProps} />);
    clickRoutineCard('Push Day');
    await act(() => vi.runAllTimersAsync());
    expect(screen.getByText('Bench Press')).toBeTruthy();

    fireEvent.click(screen.getByText(`← ${t.labels.routines}`));
    await act(() => vi.runAllTimersAsync());
    expect(screen.getByText('Leg Day')).toBeTruthy();
  });

  // --- Badge prescription ---

  it('shows only sets when reps is empty (no × character)', async () => {
    const routinesWithNoReps: Routine[] = [
      {
        id: 'r3',
        name: 'No Reps Day',
        exercises: [{ exerciseId: 'ex1', sets: 4, reps: '', dropset: false, toFailure: false }],
      },
    ];
    render(<RoutinesScreen {...defaultProps} routines={routinesWithNoReps} />);
    clickRoutineCard('No Reps Day');
    await act(() => vi.runAllTimersAsync());
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.queryByText('4×')).toBeNull();
  });

  it('shows toFailure badge in detail view', async () => {
    const routinesWithFailure: Routine[] = [
      {
        id: 'r4',
        name: 'Failure Day',
        exercises: [{ exerciseId: 'ex1', sets: 3, reps: '', dropset: false, toFailure: true }],
      },
    ];
    render(<RoutinesScreen {...defaultProps} routines={routinesWithFailure} />);
    clickRoutineCard('Failure Day');
    await act(() => vi.runAllTimersAsync());
    expect(screen.getByText(t.labels.toFailure)).toBeTruthy();
  });

  it('toggling toFailure in create modal disables reps field', async () => {
    render(<RoutinesScreen {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: t.labels.newRoutine }));
    await act(() => vi.runAllTimersAsync());

    fireEvent.click(screen.getByText('Bench Press'));

    const repsInput = screen.getByPlaceholderText('10') as HTMLInputElement;
    expect(repsInput.disabled).toBe(false);

    const toFailureButtons = screen.getAllByRole('button').filter(
      (b) => b.closest('[class*="grid-cols-4"]') !== null
    );
    const toFailureToggle = toFailureButtons[toFailureButtons.length - 1];
    fireEvent.click(toFailureToggle);

    expect((screen.getByPlaceholderText('10') as HTMLInputElement).disabled).toBe(true);
  });

  it('sets field allows empty value during editing and clamps to 1 on blur', async () => {
    render(<RoutinesScreen {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: t.labels.newRoutine }));
    await act(() => vi.runAllTimersAsync());

    fireEvent.click(screen.getByText('Bench Press'));

    const setsInput = screen.getByDisplayValue('3') as HTMLInputElement;
    fireEvent.change(setsInput, { target: { value: '' } });
    expect(setsInput.value).toBe('');

    fireEvent.blur(setsInput);
    expect(setsInput.value).toBe('1');
  });

  // --- Long press in detail view ---

  it('opens action sheet when an exercise in detail view is long-pressed', async () => {
    render(<RoutinesScreen {...defaultProps} />);
    clickRoutineCard('Push Day');
    await act(() => vi.runAllTimersAsync());

    const exerciseCard = screen.getByText('Bench Press').closest('div[class*="bg-ios-card"]')!;
    fireEvent.mouseDown(exerciseCard);
    
    act(() => { vi.advanceTimersByTime(600); });
    await act(() => vi.runAllTimersAsync());

    // This should not crash and should show the ActionSheet with correct title
    expect(screen.getByText('Bench Press', { selector: 'p' })).toBeTruthy();
    expect(screen.getByText(t.labels.editExerciseInRoutine)).toBeTruthy();
    expect(screen.getByText(t.labels.removeFromRoutine)).toBeTruthy();
  });
});
