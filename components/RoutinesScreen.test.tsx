import React from 'react';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { RoutinesScreen } from './RoutinesScreen';
import { Exercise, Routine } from '../types';
import { getTranslatedGroupName, t } from '../utils/translations';
import { ToastProvider } from '../hooks/useToast';

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
  muscleGroups: [],
  activeRoutineId: null,
  onSaveRoutine: vi.fn(),
  onActiveRoutineChange: vi.fn(),
  onDeleteRoutine: vi.fn(),
  onLogExercise: vi.fn(),
  onReorderRoutine: vi.fn(),
  onReorderRoutineExercise: vi.fn(),
  onUpdateNote: vi.fn(),
  onUpdateLog: vi.fn(),
  onDeleteLog: vi.fn(),
  onDeleteAllLogs: vi.fn(),
  onDeleteAllLogsExceptLatest: vi.fn(),
  onDeleteExercise: vi.fn(),
  onNavigateToExercise: vi.fn(),
};

const renderScreen = (props: Partial<React.ComponentProps<typeof RoutinesScreen>> = {}) => {
  const TestScreen = () => {
    const [activeRoutineId, setActiveRoutineId] = React.useState<string | null>(props.activeRoutineId ?? defaultProps.activeRoutineId);

    return (
      <ToastProvider>
        <RoutinesScreen
          {...defaultProps}
          {...props}
          activeRoutineId={activeRoutineId}
          onActiveRoutineChange={(id) => {
            setActiveRoutineId(id);
            props.onActiveRoutineChange?.(id);
          }}
        />
      </ToastProvider>
    );
  };

  return render(<TestScreen />);
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
    renderScreen();
    expect(screen.getByText('Push Day')).toBeTruthy();
    expect(screen.getByText('Leg Day')).toBeTruthy();
  });

  it('shows empty state when there are no routines', () => {
    renderScreen({ routines: [] });
    expect(screen.getByText(t.labels.noRoutines)).toBeTruthy();
  });

  it('shows each routine exercise count', () => {
    renderScreen();
    const counts = screen.getAllByText(`1 ${t.labels.exercises}`);
    expect(counts).toHaveLength(2);
  });

  it('shows muscle group chips for each routine in list', () => {
    renderScreen();

    expect(screen.getByText(getTranslatedGroupName('Pecho'))).toBeTruthy();
    expect(screen.getByText(getTranslatedGroupName('Pierna'))).toBeTruthy();
  });

  it('deduplicates repeated muscle groups in a routine', () => {
    const repeatedGroupExercises: Exercise[] = [
      ...exercises,
      { id: 'ex3', name: 'Incline Press', muscleGroup: 'Pecho', logs: [] },
    ];
    const repeatedGroupRoutine: Routine[] = [
      {
        id: 'r3',
        name: 'Chest Day',
        exercises: [
          { exerciseId: 'ex1', sets: 3, reps: '10', dropset: false, toFailure: false },
          { exerciseId: 'ex3', sets: 3, reps: '12', dropset: false, toFailure: false },
        ],
      },
    ];

    renderScreen({ exercises: repeatedGroupExercises, routines: repeatedGroupRoutine });

    expect(screen.getAllByText(getTranslatedGroupName('Pecho'))).toHaveLength(1);
  });

  // --- Create modal ---

  it('opens create modal when FAB is clicked', async () => {
    renderScreen();
    const fab = screen.getByRole('button', { name: t.labels.newRoutine });
    fireEvent.click(fab);
    await act(() => vi.runAllTimersAsync());
    expect(screen.getByText(t.labels.newRoutine, { selector: 'h2' })).toBeTruthy();
  });

  it('calls onSaveRoutine with a new routine when saved', async () => {
    const onSaveRoutine = vi.fn();
    renderScreen({ onSaveRoutine });

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
    renderScreen({ onSaveRoutine });

    fireEvent.click(screen.getByRole('button', { name: t.labels.newRoutine }));
    await act(() => vi.runAllTimersAsync());

    const saveBtn = screen.getByRole('button', { name: t.actions.save });
    expect((saveBtn as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(saveBtn);
    expect(onSaveRoutine).not.toHaveBeenCalled();
  });

  // --- Edit modal (via long-press ActionSheet) ---

  it('opens edit modal pre-filled with routine data when edit button is clicked', async () => {
    renderScreen();

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
    renderScreen({ onSaveRoutine });

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
    renderScreen({ onDeleteRoutine });

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
    renderScreen({ onDeleteRoutine });

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
    renderScreen();
    clickRoutineCard('Push Day');
    await act(() => vi.runAllTimersAsync());
    expect(screen.getByText('Bench Press')).toBeTruthy();
  });

  it('shows prescription info (sets x reps) in detail view', async () => {
    renderScreen();
    clickRoutineCard('Push Day');
    await act(() => vi.runAllTimersAsync());
    expect(screen.getByText('3 sets × 10 reps')).toBeTruthy();
  });

  it('shows dropset badge when dropset is enabled', async () => {
    renderScreen();
    clickRoutineCard('Leg Day');
    await act(() => vi.runAllTimersAsync());
    expect(screen.getByText(t.labels.dropset)).toBeTruthy();
  });

  it('shows last log values as placeholder in log form', async () => {
    renderScreen();
    clickRoutineCard('Push Day');
    await act(() => vi.runAllTimersAsync());

    const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    const weightInput = inputs.find((i) => i.value === '70');
    const repsInput = inputs.find((i) => i.value === '10');
    expect(weightInput).toBeTruthy();
    expect(repsInput).toBeTruthy();
  });

  it('calls onLogExercise with correct values', async () => {
    const onLogExercise = vi.fn();
    renderScreen({ onLogExercise });

    clickRoutineCard('Push Day');
    await act(() => vi.runAllTimersAsync());

    const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    const weightInput = inputs.find((i) => i.value === '70')!;
    fireEvent.change(weightInput, { target: { value: '75' } });

    const logButton = screen.getByRole('button', { name: t.actions.log });
    fireEvent.click(logButton);
    await act(() => vi.runAllTimersAsync());

    expect(onLogExercise).toHaveBeenCalledWith('ex1', 75, 10);
  });

  it('returns to routine list from detail view', async () => {
    renderScreen();
    clickRoutineCard('Push Day');
    await act(() => vi.runAllTimersAsync());
    expect(screen.getByText('Bench Press')).toBeTruthy();

    fireEvent.click(screen.getByText(t.labels.routines));
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
    renderScreen({ routines: routinesWithNoReps });
    clickRoutineCard('No Reps Day');
    await act(() => vi.runAllTimersAsync());
    expect(screen.getByText('4 sets')).toBeTruthy();
    expect(screen.queryByText(/×/)).toBeNull();
  });

  it('shows toFailure badge in detail view', async () => {
    const routinesWithFailure: Routine[] = [
      {
        id: 'r4',
        name: 'Failure Day',
        exercises: [{ exerciseId: 'ex1', sets: 3, reps: '', dropset: false, toFailure: true }],
      },
    ];
    renderScreen({ routines: routinesWithFailure });
    clickRoutineCard('Failure Day');
    await act(() => vi.runAllTimersAsync());
    expect(screen.getByText(t.labels.toFailure)).toBeTruthy();
  });

  it('toggling toFailure in create modal disables reps field', async () => {
    renderScreen();
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
    renderScreen();
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
    const multiExRoutine: Routine[] = [
      {
        id: 'r5',
        name: 'Full Day',
        exercises: [
          { exerciseId: 'ex1', sets: 3, reps: '10', dropset: false, toFailure: false },
          { exerciseId: 'ex2', sets: 3, reps: '10', dropset: false, toFailure: false },
        ],
      },
    ];
    renderScreen({ routines: multiExRoutine });

    const card = screen.getByText('Full Day').closest('div[class*="rounded-2xl"]')!;
    fireEvent.mouseDown(card);
    fireEvent.mouseUp(card);
    await act(() => vi.runAllTimersAsync());

    const exerciseCard = screen.getByText('Bench Press').closest('div[class*="rounded-2xl"]')!;
    fireEvent.mouseDown(exerciseCard);
    act(() => { vi.advanceTimersByTime(600); });
    await act(() => vi.runAllTimersAsync());

    expect(screen.getByText('Bench Press', { selector: 'p' })).toBeTruthy();
    expect(screen.getByText(t.labels.move)).toBeTruthy();
    expect(screen.getByText(t.labels.removeFromRoutine)).toBeTruthy();
  });

  it('opens a dedicated move modal and reorders an exercise to the selected position', async () => {
    const onReorderRoutineExercise = vi.fn();
    const multiExRoutine: Routine[] = [
      {
        id: 'r5',
        name: 'Full Day',
        exercises: [
          { exerciseId: 'ex1', sets: 3, reps: '10', dropset: false, toFailure: false },
          { exerciseId: 'ex2', sets: 3, reps: '10', dropset: false, toFailure: false },
        ],
      },
    ];

    renderScreen({ routines: multiExRoutine, onReorderRoutineExercise });

    const card = screen.getByText('Full Day').closest('div[class*="rounded-2xl"]')!;
    fireEvent.mouseDown(card);
    fireEvent.mouseUp(card);
    await act(() => vi.runAllTimersAsync());

    const exerciseCard = screen.getByText('Bench Press').closest('div[class*="rounded-2xl"]')!;
    fireEvent.mouseDown(exerciseCard);
    act(() => { vi.advanceTimersByTime(600); });
    await act(() => vi.runAllTimersAsync());

    fireEvent.click(screen.getByText(t.labels.move));
    await act(() => vi.runAllTimersAsync());

    expect(screen.getByText(t.labels.moveExercise, { selector: 'h2' })).toBeTruthy();
    expect(screen.getByText(t.labels.movePreview)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: t.labels.moveDown }));
    fireEvent.click(screen.getByRole('button', { name: t.actions.save }));
    await act(() => vi.runAllTimersAsync());

    expect(onReorderRoutineExercise).toHaveBeenCalledWith('r5', 0, 1);
  });
  it('updates form and logs the alternative exercise correctly', async () => {
    const customExercises = [
      ...exercises,
      { id: 'ex3', name: 'Alt Press', muscleGroup: 'Pecho', logs: [{ date: '2026-01-20', weight: 80, reps: 12 }] },
    ] as Exercise[];

    const altRoutines = [
      {
        id: 'r3',
        name: 'Alt Day',
        exercises: [{ exerciseId: 'ex1', alternativeExerciseId: 'ex3', sets: 3, reps: '10', dropset: false, toFailure: false }],
      },
    ];

    const onLogExerciseMock = vi.fn();
    renderScreen({ exercises: customExercises, routines: altRoutines, onLogExercise: onLogExerciseMock });

    // Open Routine
    const card = screen.getByText('Alt Day').closest('div[class*="rounded-2xl"]')!;
    fireEvent.mouseDown(card);
    fireEvent.mouseUp(card);
    await act(() => vi.runAllTimersAsync());

    // Check placeholder for ex1
    const weightInput = screen.getByDisplayValue('70') as HTMLInputElement;
    expect(weightInput).toBeTruthy();

    // Toggle Alternative
    const toggleBtn = screen.getByText(t.labels.swapToAlternative).closest('button')!;
    fireEvent.click(toggleBtn);
    await act(() => vi.runAllTimersAsync());

    // Check placeholder changed for Alt Press (ex3)
    const newWeightInput = screen.getByDisplayValue('80') as HTMLInputElement;
    expect(newWeightInput).toBeTruthy();

    // Enter new weight and log
    fireEvent.change(newWeightInput, { target: { value: '85' } });
    const repsInput = screen.getByDisplayValue('12') as HTMLInputElement;
    fireEvent.change(repsInput, { target: { value: '10' } });

    const logBtn = screen.getByText(t.actions.log);
    fireEvent.click(logBtn);
    await act(() => vi.runAllTimersAsync());

    // Should call onLogExercise with alternative exercise ID (ex3)
    expect(onLogExerciseMock).toHaveBeenCalledWith('ex3', 85, 10);
    
    // Check it reset placeholder for Alt Press
    expect(screen.getByDisplayValue('80')).toBeTruthy();
  });
});
