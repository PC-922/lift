import React from 'react';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { RoutinesScreen } from './RoutinesScreen';
import { Exercise, Routine } from '../types';
import { t } from '../utils/translations';
import { ToastProvider } from '../hooks/useToast';
import { RestTimerProvider } from '../hooks/useRestTimer';

const renderWithToast = (ui: React.ReactElement) =>
  render(
    <RestTimerProvider>
      <ToastProvider>{ui}</ToastProvider>
    </RestTimerProvider>
  );

function dispatchPointer(element: Element | Window, type: string, clientY: number, pointerId = 1) {
  const init: PointerEventInit = { bubbles: true, cancelable: true, pointerId, clientY };
  const event = typeof window.PointerEvent !== 'undefined'
    ? new PointerEvent(type, init)
    : new MouseEvent(type, init);
  element.dispatchEvent(event);
}

const dayId = 'd1';

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
    days: [{ id: dayId, name: 'Día 1', exercises: [{ exerciseId: 'ex1', sets: 3, reps: '10', dropset: false, toFailure: false }] }],
  },
  {
    id: 'r2',
    name: 'Leg Day',
    days: [{ id: dayId, name: 'Día 1', exercises: [{ exerciseId: 'ex2', sets: 4, reps: '12', dropset: true, toFailure: false }] }],
  },
];

const defaultProps = {
  routines,
  exercises,
  muscleGroups: [],
  onSaveRoutine: vi.fn(),
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
  onShareRoutine: vi.fn(),
  onImportRoutine: vi.fn(() => Promise.resolve(true)),
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
    renderWithToast(<RoutinesScreen {...defaultProps} />);
    expect(screen.getByText('Push Day')).toBeTruthy();
    expect(screen.getByText('Leg Day')).toBeTruthy();
  });

  it('shows empty state when there are no routines', () => {
    renderWithToast(<RoutinesScreen {...defaultProps} routines={[]} />);
    expect(screen.getByText(t.labels.noRoutines)).toBeTruthy();
  });

  it('shows each routine exercise count and day count', () => {
    renderWithToast(<RoutinesScreen {...defaultProps} />);
    const counts = screen.getAllByText(`1 ${t.labels.exercises} · 1 ${t.labels.days}`);
    expect(counts).toHaveLength(2);
  });

  it('calls onShareRoutine when share action is selected', async () => {
    const onShareRoutine = vi.fn();
    renderWithToast(<RoutinesScreen {...defaultProps} onShareRoutine={onShareRoutine} />);

    const menus = screen.getAllByRole('button', { name: 'Menu' });
    fireEvent.click(menus[0]);
    await act(() => vi.runAllTimersAsync());

    fireEvent.click(screen.getByText(t.actions.share));
    await act(() => vi.runAllTimersAsync());

    expect(onShareRoutine).toHaveBeenCalledWith(routines[0]);
  });

  it('calls onImportRoutine when a file is selected', async () => {
    const onImportRoutine = vi.fn(() => Promise.resolve(true));
    renderWithToast(<RoutinesScreen {...defaultProps} onImportRoutine={onImportRoutine} />);

    const file = new File(['{}'], 'routine.json', { type: 'application/json' });
    const input = screen.getByTestId('import-routine-input');
    fireEvent.change(input, { target: { files: [file] } });
    await act(() => vi.runAllTimersAsync());

    expect(onImportRoutine).toHaveBeenCalledWith(file);
  });

  // --- Create modal ---

  it('opens create modal when FAB is clicked', async () => {
    renderWithToast(<RoutinesScreen {...defaultProps} />);
    const fab = screen.getByRole('button', { name: t.labels.newRoutine });
    fireEvent.click(fab);
    await act(() => vi.runAllTimersAsync());
    expect(screen.getByText(t.labels.newRoutine, { selector: 'h2' })).toBeTruthy();
  });

  it('calls onSaveRoutine with a new routine when saved', async () => {
    const onSaveRoutine = vi.fn();
    renderWithToast(<RoutinesScreen {...defaultProps} onSaveRoutine={onSaveRoutine} />);

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
    expect(saved.days[0].exercises[0].exerciseId).toBe('ex1');
    expect(saved.days[0].exercises[0].sets).toBe(3);
    expect(saved.days[0].exercises[0].reps).toBe('10');
    expect(saved.days[0].exercises[0].dropset).toBe(false);
    expect(saved.days[0].exercises[0].toFailure).toBe(false);
  });

  it('does not call onSaveRoutine when name is empty', async () => {
    const onSaveRoutine = vi.fn();
    renderWithToast(<RoutinesScreen {...defaultProps} onSaveRoutine={onSaveRoutine} />);

    fireEvent.click(screen.getByRole('button', { name: t.labels.newRoutine }));
    await act(() => vi.runAllTimersAsync());

    const saveBtn = screen.getByRole('button', { name: t.actions.save });
    expect((saveBtn as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(saveBtn);
    expect(onSaveRoutine).not.toHaveBeenCalled();
  });

  // --- Edit modal (via three-dot menu) ---

  it('opens edit modal pre-filled with routine data when edit button is clicked', async () => {
    renderWithToast(<RoutinesScreen {...defaultProps} />);

    const menus = screen.getAllByRole('button', { name: 'Menu' });
    fireEvent.click(menus[0]);
    await act(() => vi.runAllTimersAsync());

    fireEvent.click(screen.getByText(t.actions.edit));

    const nameInput = screen.getByDisplayValue('Push Day');
    expect(nameInput).toBeTruthy();
  });

  it('shows selected exercises before unselected ones in the edit modal', async () => {
    const customExercises: Exercise[] = [
      { id: 'ex1', name: 'Z Press', muscleGroup: 'Pecho', logs: [] },
      { id: 'ex2', name: 'Bench Press', muscleGroup: 'Pecho', logs: [] },
      { id: 'ex3', name: 'Curl', muscleGroup: 'Bíceps', logs: [] },
    ];
    const selectedRoutine: Routine[] = [
      {
        id: 'r1',
        name: 'Push Day',
        days: [{ id: dayId, name: 'Día 1', exercises: [{ exerciseId: 'ex1', sets: 3, reps: '10', dropset: false, toFailure: false }] }],
      },
    ];
    renderWithToast(<RoutinesScreen {...defaultProps} exercises={customExercises} routines={selectedRoutine} />);

    const menus = screen.getAllByRole('button', { name: 'Menu' });
    fireEvent.click(menus[0]);
    await act(() => vi.runAllTimersAsync());
    fireEvent.click(screen.getByText(t.actions.edit));

    const exerciseButtons = screen
      .getAllByRole('button')
      .map((button) => button.textContent ?? '')
      .filter((text) => ['Z Press', 'Bench Press', 'Curl'].some((name) => text.includes(name)));

    expect(exerciseButtons[0]).toContain('Z Press');
    expect(exerciseButtons[1]).toContain('Bench Press');
    expect(exerciseButtons[2]).toContain('Curl');
  });

  it('calls onSaveRoutine with updated routine when editing', async () => {
    const onSaveRoutine = vi.fn();
    renderWithToast(<RoutinesScreen {...defaultProps} onSaveRoutine={onSaveRoutine} />);

    const menus = screen.getAllByRole('button', { name: 'Menu' });
    fireEvent.click(menus[0]);
    await act(() => vi.runAllTimersAsync());

    fireEvent.click(screen.getByText(t.actions.edit));

    const nameInput = screen.getByDisplayValue('Push Day');
    fireEvent.change(nameInput, { target: { value: 'Push Day Updated' } });
    fireEvent.click(screen.getByRole('button', { name: t.actions.save }));
    await act(() => vi.runAllTimersAsync());

    expect(onSaveRoutine).toHaveBeenCalledOnce();
    const saved = onSaveRoutine.mock.calls[0][0] as Routine;
    expect(saved.id).toBe('r1');
    expect(saved.name).toBe('Push Day Updated');
  });

  // --- Delete (via three-dot menu) ---

  it('calls onDeleteRoutine after confirmation', async () => {
    const onDeleteRoutine = vi.fn();
    renderWithToast(<RoutinesScreen {...defaultProps} onDeleteRoutine={onDeleteRoutine} />);

    const menus = screen.getAllByRole('button', { name: 'Menu' });
    fireEvent.click(menus[0]);
    await act(() => vi.runAllTimersAsync());

    fireEvent.click(screen.getByText(t.actions.delete));
    await act(() => vi.runAllTimersAsync());

    const confirmButton = screen.getByTestId('confirm-modal-confirm');
    fireEvent.click(confirmButton);
    await act(() => vi.runAllTimersAsync());

    expect(onDeleteRoutine).toHaveBeenCalledWith('r1');
  });

  it('does not call onDeleteRoutine when confirmation is cancelled', async () => {
    const onDeleteRoutine = vi.fn();
    renderWithToast(<RoutinesScreen {...defaultProps} onDeleteRoutine={onDeleteRoutine} />);

    const menus = screen.getAllByRole('button', { name: 'Menu' });
    fireEvent.click(menus[0]);
    await act(() => vi.runAllTimersAsync());

    fireEvent.click(screen.getByText(t.actions.delete));
    await act(() => vi.runAllTimersAsync());

    const cancelButton = screen.getByRole('button', { name: t.actions.cancel });
    fireEvent.click(cancelButton);

    expect(onDeleteRoutine).not.toHaveBeenCalled();
  });

  const openDay = (name = 'Día 1') => {
    fireEvent.click(screen.getByRole('heading', { name }));
  };

  // --- Detail view ---

  it('navigates to detail view when a routine card is clicked', () => {
    renderWithToast(<RoutinesScreen {...defaultProps} activeRoutineId="r1" onActiveRoutineChange={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Día 1' })).toBeTruthy();
    openDay();
    expect(screen.getByRole('heading', { name: 'Bench Press' })).toBeTruthy();
  });

  it('shows prescription info (sets x reps) in detail view', () => {
    renderWithToast(<RoutinesScreen {...defaultProps} activeRoutineId="r1" onActiveRoutineChange={vi.fn()} />);
    openDay();
    expect(screen.getByText('3 sets × 10 reps')).toBeTruthy();
  });

  it('shows dropset badge when dropset is enabled', () => {
    renderWithToast(<RoutinesScreen {...defaultProps} activeRoutineId="r2" onActiveRoutineChange={vi.fn()} />);
    openDay();
    expect(screen.getByText(t.labels.dropset)).toBeTruthy();
  });

  it('shows last log values as placeholder in log form', () => {
    renderWithToast(<RoutinesScreen {...defaultProps} activeRoutineId="r1" onActiveRoutineChange={vi.fn()} />);
    openDay();

    const inputs = screen.getAllByDisplayValue(/^(70|10)$/) as HTMLInputElement[];
    const weightInput = inputs.find((i) => i.value === '70');
    const repsInput = inputs.find((i) => i.value === '10');
    expect(weightInput).toBeTruthy();
    expect(repsInput).toBeTruthy();
  });

  it('calls onLogExercise with correct values', async () => {
    const onLogExercise = vi.fn();
    renderWithToast(<RoutinesScreen {...defaultProps} activeRoutineId="r1" onActiveRoutineChange={vi.fn()} onLogExercise={onLogExercise} />);
    openDay();

    const inputs = screen.getAllByDisplayValue(/^(70|10)$/) as HTMLInputElement[];
    const weightInput = inputs.find((i) => i.value === '70')!;
    fireEvent.change(weightInput, { target: { value: '75' } });

    const logButton = screen.getByRole('button', { name: t.actions.log });
    fireEvent.click(logButton);
    await act(() => vi.runAllTimersAsync());

    expect(onLogExercise).toHaveBeenCalledWith('ex1', 75, 10);
  });

  it('shows a regression toast when weight decreases', () => {
    const onLogExercise = vi.fn();
    renderWithToast(<RoutinesScreen {...defaultProps} activeRoutineId="r1" onActiveRoutineChange={vi.fn()} onLogExercise={onLogExercise} />);
    openDay();

    const inputs = screen.getAllByDisplayValue(/^(70|10)$/) as HTMLInputElement[];
    const weightInput = inputs.find((i) => i.value === '70')!;
    fireEvent.change(weightInput, { target: { value: '65' } });

    fireEvent.click(screen.getByRole('button', { name: t.actions.log }));

    expect(screen.getByText(t.labels.regressionRecord)).toBeTruthy();
  });

  it('returns to routine list from detail view', async () => {
    const onActiveRoutineChange = vi.fn();
    renderWithToast(<RoutinesScreen {...defaultProps} activeRoutineId="r1" onActiveRoutineChange={onActiveRoutineChange} />);
    fireEvent.click(screen.getByText(t.labels.routines));
    expect(onActiveRoutineChange).toHaveBeenCalledWith(null);
  });

  // --- Badge prescription ---

  it('shows only sets when reps is empty (no × character)', () => {
    const routinesWithNoReps: Routine[] = [
      {
        id: 'r3',
        name: 'No Reps Day',
        days: [{ id: dayId, name: 'Día 1', exercises: [{ exerciseId: 'ex1', sets: 4, reps: '', dropset: false, toFailure: false }] }],
      },
    ];
    renderWithToast(<RoutinesScreen {...defaultProps} routines={routinesWithNoReps} activeRoutineId="r3" onActiveRoutineChange={vi.fn()} />);
    openDay();
    expect(screen.getByText('4 sets')).toBeTruthy();
    expect(screen.queryByText(/×/)).toBeNull();
  });

  it('shows toFailure badge in detail view', () => {
    const routinesWithFailure: Routine[] = [
      {
        id: 'r4',
        name: 'Failure Day',
        days: [{ id: dayId, name: 'Día 1', exercises: [{ exerciseId: 'ex1', sets: 3, reps: '', dropset: false, toFailure: true }] }],
      },
    ];
    renderWithToast(<RoutinesScreen {...defaultProps} routines={routinesWithFailure} activeRoutineId="r4" onActiveRoutineChange={vi.fn()} />);
    openDay();
    expect(screen.getByText(t.labels.toFailure)).toBeTruthy();
  });

  it('toggling toFailure in create modal disables reps field', async () => {
    renderWithToast(<RoutinesScreen {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: t.labels.newRoutine }));
    await act(() => vi.runAllTimersAsync());

    fireEvent.click(screen.getByText('Bench Press'));

    const repsInput = screen.getByPlaceholderText('10') as HTMLInputElement;
    expect(repsInput.disabled).toBe(false);

    const toFailureButtons = screen.getAllByRole('button').filter(
      (b) => b.closest('[class*="grid-cols-"]') !== null
    );
    const toFailureToggle = toFailureButtons[toFailureButtons.length - 1];
    fireEvent.click(toFailureToggle);

    expect((screen.getByPlaceholderText('10') as HTMLInputElement).disabled).toBe(true);
  });

  it('sets field allows empty value during editing and clamps to 1 on blur', async () => {
    renderWithToast(<RoutinesScreen {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: t.labels.newRoutine }));
    await act(() => vi.runAllTimersAsync());

    fireEvent.click(screen.getByText('Bench Press'));

    const setsInput = screen.getByDisplayValue('3') as HTMLInputElement;
    fireEvent.change(setsInput, { target: { value: '' } });
    expect(setsInput.value).toBe('');

    fireEvent.blur(setsInput);
    expect(setsInput.value).toBe('1');
  });

  // --- Exercise menu in detail view ---

  it('opens action sheet when an exercise in detail view menu is clicked', async () => {
    const multiExRoutine: Routine[] = [
      {
        id: 'r5',
        name: 'Full Day',
        days: [{ id: dayId, name: 'Día 1', exercises: [
          { exerciseId: 'ex1', sets: 3, reps: '10', dropset: false, toFailure: false },
          { exerciseId: 'ex2', sets: 3, reps: '10', dropset: false, toFailure: false },
        ] }],
      },
    ];
    renderWithToast(<RoutinesScreen {...defaultProps} routines={multiExRoutine} activeRoutineId="r5" onActiveRoutineChange={vi.fn()} />);
    openDay();

    const menus = screen.getAllByRole('button', { name: 'Menu' });
    fireEvent.click(menus[0]);
    await act(() => vi.runAllTimersAsync());

    expect(screen.getByText('Bench Press', { selector: 'p' })).toBeTruthy();
    expect(screen.queryByText(t.labels.move)).toBeNull();
    expect(screen.getByText(t.labels.removeFromRoutine)).toBeTruthy();
  });

  it('reorders an exercise by dragging the handle', async () => {
    const onReorderRoutineExercise = vi.fn();
    const multiExRoutine: Routine[] = [
      {
        id: 'r5',
        name: 'Full Day',
        days: [{ id: dayId, name: 'Día 1', exercises: [
          { exerciseId: 'ex1', sets: 3, reps: '10', dropset: false, toFailure: false },
          { exerciseId: 'ex2', sets: 3, reps: '10', dropset: false, toFailure: false },
        ] }],
      },
    ];

    renderWithToast(
      <RoutinesScreen
        {...defaultProps}
        routines={multiExRoutine}
        activeRoutineId="r5"
        onActiveRoutineChange={vi.fn()}
        onReorderRoutineExercise={onReorderRoutineExercise}
      />
    );
    openDay();

    const handles = screen.getAllByRole('button', { name: t.labels.dragToReorder });
    const items = screen.getAllByText('Bench Press', { selector: 'h3' }).map((heading) => heading.closest('div.rounded-2xl'));
    const rects = [
      { top: 0, height: 50, bottom: 50, left: 0, right: 100, width: 100, x: 0, y: 0 },
      { top: 50, height: 50, bottom: 100, left: 0, right: 100, width: 100, x: 0, y: 50 },
    ];
    items.forEach((item, index) => {
      if (item) item.getBoundingClientRect = vi.fn(() => rects[index] as DOMRect);
    });
    handles[0].setPointerCapture = vi.fn();

    act(() => dispatchPointer(handles[0], 'pointerdown', 25));
    act(() => dispatchPointer(window, 'pointermove', 75));
    act(() => dispatchPointer(window, 'pointerup', 75));
    await act(() => vi.runAllTimersAsync());

    expect(onReorderRoutineExercise).toHaveBeenCalledWith('r5', dayId, 0, 1);
  });

  it('shows muscle group badges for each day in detail view', async () => {
    const multiGroupRoutine: Routine[] = [
      {
        id: 'r6',
        name: 'Mixed Day',
        days: [{ id: dayId, name: 'Día 1', exercises: [
          { exerciseId: 'ex1', sets: 3, reps: '10', dropset: false, toFailure: false },
          { exerciseId: 'ex2', sets: 3, reps: '10', dropset: false, toFailure: false },
        ] }],
      },
    ];
    renderWithToast(<RoutinesScreen {...defaultProps} routines={multiGroupRoutine} activeRoutineId="r6" onActiveRoutineChange={vi.fn()} />);
    expect(screen.getByTitle('Chest, Pierna')).toBeTruthy();
  });

  it('allows adding and naming a second day in create modal', async () => {
    const onSaveRoutine = vi.fn();
    renderWithToast(<RoutinesScreen {...defaultProps} onSaveRoutine={onSaveRoutine} />);

    fireEvent.click(screen.getByRole('button', { name: t.labels.newRoutine }));
    await act(() => vi.runAllTimersAsync());

    fireEvent.click(screen.getByRole('button', { name: t.labels.addDay }));

    const dayNameInput = screen.getByPlaceholderText(t.labels.dayName);
    fireEvent.change(dayNameInput, { target: { value: 'Pull' } });

    expect(screen.getByRole('button', { name: 'Pull' })).toBeTruthy();

    fireEvent.click(screen.getByText('Squat'));

    const nameInput = screen.getByPlaceholderText(t.labels.routineName);
    fireEvent.change(nameInput, { target: { value: 'Two Day Routine' } });

    fireEvent.click(screen.getByRole('button', { name: t.actions.save }));
    await act(() => vi.runAllTimersAsync());

    const saved = onSaveRoutine.mock.calls[0][0] as Routine;
    expect(saved.days).toHaveLength(2);
    expect(saved.days[1].name).toBe('Pull');
    expect(saved.days[1].exercises[0].exerciseId).toBe('ex2');
  });

  it('saves rest seconds for a routine exercise', async () => {
    const onSaveRoutine = vi.fn();
    renderWithToast(<RoutinesScreen {...defaultProps} onSaveRoutine={onSaveRoutine} />);

    fireEvent.click(screen.getByRole('button', { name: t.labels.newRoutine }));
    await act(() => vi.runAllTimersAsync());

    fireEvent.click(screen.getByText('Bench Press'));

    const restInputs = screen.getAllByPlaceholderText('90');
    const restInput = restInputs[0] as HTMLInputElement;
    fireEvent.change(restInput, { target: { value: '120' } });
    fireEvent.blur(restInput);

    const nameInput = screen.getByPlaceholderText(t.labels.routineName);
    fireEvent.change(nameInput, { target: { value: 'Rest Routine' } });

    fireEvent.click(screen.getByRole('button', { name: t.actions.save }));
    await act(() => vi.runAllTimersAsync());

    const saved = onSaveRoutine.mock.calls[0][0] as Routine;
    expect(saved.days[0].exercises[0].restSeconds).toBe(120);
  });
});
