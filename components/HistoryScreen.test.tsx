import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { HistoryScreen } from './HistoryScreen';
import { Exercise } from '../types';
import { t } from '../utils/translations';

const defaultProps = {
  onUpdateLog: vi.fn(),
  onDeleteLog: vi.fn(),
  onDeleteAllLogs: vi.fn(),
  onDeleteAllLogsExceptLatest: vi.fn(),
};

describe('HistoryScreen', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const exercises: Exercise[] = [
    {
      id: '1',
      name: 'Alpha',
      muscleGroup: 'Pecho',
      logs: [
        { date: '2026-01-15', weight: 40, reps: 8 },
        { date: '2026-02-01', weight: 50, reps: 10 },
      ],
    },
    {
      id: '2',
      name: 'Beta',
      muscleGroup: 'Espalda',
      logs: [],
    },
  ];

  it('renders exercises sorted by name', () => {
    render(<HistoryScreen exercises={exercises} {...defaultProps} />);
    const items = screen.getAllByTestId('history-exercise-item');
    expect(items[0].textContent).toContain('Alpha');
    expect(items[1].textContent).toContain('Beta');
  });

  it('updates a log entry from the modal', async () => {
    const onUpdateLog = vi.fn();
    render(<HistoryScreen exercises={exercises} {...defaultProps} onUpdateLog={onUpdateLog} />);

    fireEvent.click(screen.getAllByTestId('history-exercise-item')[0]);
    const weightInputs = await screen.findAllByLabelText(t.labels.weightShort);
    fireEvent.change(weightInputs[0], { target: { value: '55' } });

    const saveButtons = screen.getAllByRole('button', { name: t.actions.save });
    fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(onUpdateLog).toHaveBeenCalledWith('1', '2026-02-01', {
        date: '2026-02-01',
        weight: 55,
        reps: 10,
      });
    });
  });

  it('deletes a log entry with confirmation', async () => {
    const onDeleteLog = vi.fn();

    render(<HistoryScreen exercises={exercises} {...defaultProps} onDeleteLog={onDeleteLog} />);
    fireEvent.click(screen.getAllByTestId('history-exercise-item')[0]);
    const deleteButtons = await screen.findAllByRole('button', { name: t.actions.delete });
    fireEvent.click(deleteButtons[0]);

    const confirmButton = await screen.findByTestId('confirm-modal-confirm');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(onDeleteLog).toHaveBeenCalledWith('1', '2026-02-01');
    });
  });

  it('deletes all logs with confirmation', async () => {
    const onDeleteAllLogs = vi.fn();

    render(<HistoryScreen exercises={exercises} {...defaultProps} onDeleteAllLogs={onDeleteAllLogs} />);
    fireEvent.click(screen.getAllByTestId('history-exercise-item')[0]);

    const deleteAllButton = await screen.findByRole('button', { name: t.actions.deleteAll });
    fireEvent.click(deleteAllButton);

    const confirmButton = await screen.findByTestId('confirm-modal-confirm');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(onDeleteAllLogs).toHaveBeenCalledWith('1');
    });
  });

  it('deletes all logs except latest with confirmation', async () => {
    const onDeleteAllLogsExceptLatest = vi.fn();

    render(<HistoryScreen exercises={exercises} {...defaultProps} onDeleteAllLogsExceptLatest={onDeleteAllLogsExceptLatest} />);
    fireEvent.click(screen.getAllByTestId('history-exercise-item')[0]);

    const deleteExceptButton = await screen.findByRole('button', { name: t.actions.deleteAllExceptLatest });
    fireEvent.click(deleteExceptButton);

    const confirmButton = await screen.findByTestId('confirm-modal-confirm');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(onDeleteAllLogsExceptLatest).toHaveBeenCalledWith('1');
    });
  });

  it('does not show bulk delete buttons when exercise has no logs', async () => {
    render(<HistoryScreen exercises={exercises} {...defaultProps} />);
    // Abrir Beta que no tiene logs
    fireEvent.click(screen.getAllByTestId('history-exercise-item')[1]);

    await screen.findByText(t.labels.noLogs);
    expect(screen.queryByRole('button', { name: t.actions.deleteAll })).toBeNull();
    expect(screen.queryByRole('button', { name: t.actions.deleteAllExceptLatest })).toBeNull();
  });
});
