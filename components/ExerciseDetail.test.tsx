import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExerciseDetail } from './ExerciseDetail';
import { Exercise } from '../types';
import { RestTimerProvider } from '../hooks/useRestTimer';

vi.mock('../utils/translations', async () => {
  const actual = await vi.importActual<typeof import('../utils/translations')>('../utils/translations');
  return {
    ...actual,
    useTranslations: () => actual.t,
    getTranslatedGroupName: (group: string) => group,
  };
});

vi.mock('../hooks/useToast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('./ActionSheet', () => ({
  ActionSheet: ({ title, actions, onClose }: { title: string; actions: { label: string; destructive?: boolean; onPress: () => void }[]; onClose: () => void }) => (
    <div data-testid="action-sheet">
      <p>{title}</p>
      {actions.map((action) => (
        <button
          key={action.label}
          data-testid={`action-${action.label.replace(/\s+/g, '-').toLowerCase()}`}
          onClick={() => { action.onPress(); onClose(); }}
        >
          {action.label}
        </button>
      ))}
    </div>
  ),
}));

const exercise: Exercise = {
  id: 'ex1',
  name: 'Bench Press',
  muscleGroup: 'Pecho',
  logs: [
    { date: '2026-07-24', weight: 80, reps: 8 },
    { date: '2026-07-20', weight: 75, reps: 10 },
  ],
  note: '',
};

const renderWithTimer = (ui: React.ReactElement) => render(<RestTimerProvider>{ui}</RestTimerProvider>);

describe('ExerciseDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders exercise name, category chip, and log inputs', () => {
    renderWithTimer(
      <ExerciseDetail
        exercise={exercise}
        muscleGroups={['Pecho', 'Espalda']}
        onBack={vi.fn()}
        onLog={vi.fn()}
        onUpdateNote={vi.fn()}
        onUpdateLog={vi.fn()}
        onDeleteLog={vi.fn()}
        onDeleteAllLogs={vi.fn()}
        onDeleteAllLogsExceptLatest={vi.fn()}
        onRename={vi.fn()}
        onChangeGroup={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('Bench Press')).toBeTruthy();
    expect(screen.getAllByText('Pecho').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('History')).toBeTruthy();
    expect(screen.getAllByDisplayValue('80').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByDisplayValue('8').length).toBeGreaterThanOrEqual(1);
  });

  it('opens history actions and triggers delete all logs', () => {
    const onDeleteAllLogs = vi.fn();
    renderWithTimer(
      <ExerciseDetail
        exercise={exercise}
        muscleGroups={['Pecho', 'Espalda']}
        onBack={vi.fn()}
        onLog={vi.fn()}
        onUpdateNote={vi.fn()}
        onUpdateLog={vi.fn()}
        onDeleteLog={vi.fn()}
        onDeleteAllLogs={onDeleteAllLogs}
        onDeleteAllLogsExceptLatest={vi.fn()}
        onRename={vi.fn()}
        onChangeGroup={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    fireEvent.click(screen.getByLabelText(/history/i));
    expect(screen.getByTestId('action-sheet')).toBeTruthy();

    fireEvent.click(screen.getByTestId('action-delete-all'));
    fireEvent.click(screen.getByRole('button', { name: /delete all/i }));

    expect(onDeleteAllLogs).toHaveBeenCalledTimes(1);
  });
});
