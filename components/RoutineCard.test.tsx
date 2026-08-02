import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { RoutineCard } from './RoutineCard';
import { t } from '../utils/translations';
import { Routine } from '../types';

const routine: Routine = {
  id: 'r1',
  name: 'Push Day',
  days: [
    {
      id: 'd1',
      name: 'Day A',
      exercises: [
        { exerciseId: 'ex1', sets: 3, reps: '10', dropset: false, toFailure: false },
      ],
    },
  ],
};

const defaultProps = {
  routine,
  isDragging: false,
  onClick: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onDuplicate: vi.fn(),
  onShare: vi.fn(),
  onDragHandlePointerDown: vi.fn(),
};

describe('RoutineCard', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders routine name and metadata', () => {
    render(<RoutineCard {...defaultProps} />);
    expect(screen.getByText('Push Day')).toBeTruthy();
    expect(screen.getByText(`1 ${t.labels.exercises} · 1 ${t.labels.days}`)).toBeTruthy();
  });

  it('calls onClick when the card content is clicked', () => {
    render(<RoutineCard {...defaultProps} />);
    fireEvent.click(screen.getByText('Push Day'));
    expect(defaultProps.onClick).toHaveBeenCalled();
  });

  it('opens the action sheet and calls onShare when share is selected', async () => {
    render(<RoutineCard {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    await act(() => Promise.resolve());

    fireEvent.click(screen.getByText(t.actions.share));
    expect(defaultProps.onShare).toHaveBeenCalled();
  });

  it('calls onEdit, onDuplicate, and onDelete from the action sheet', async () => {
    render(<RoutineCard {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    await act(() => Promise.resolve());

    fireEvent.click(screen.getByText(t.actions.edit));
    expect(defaultProps.onEdit).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    await act(() => Promise.resolve());
    fireEvent.click(screen.getByText(t.actions.duplicate));
    expect(defaultProps.onDuplicate).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    await act(() => Promise.resolve());
    fireEvent.click(screen.getByText(t.actions.delete));
    expect(defaultProps.onDelete).toHaveBeenCalled();
  });
});
