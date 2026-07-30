import React from 'react';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InsightsScreen, getProgressState, getProgressVariant } from './InsightsScreen';
import { Exercise } from '../types';

vi.mock('../utils/translations', async () => {
  const actual = await vi.importActual<typeof import('../utils/translations')>('../utils/translations');
  return {
    ...actual,
    useTranslations: () => actual.t,
    getTranslatedGroupName: (group: string) => group,
  };
});

const exercises: Exercise[] = [
  {
    id: 'up',
    name: 'Weight Up',
    muscleGroup: 'Pecho',
    logs: [
      { date: '2026-01-01', weight: 100, reps: 6 },
      { date: '2026-01-10', weight: 120, reps: 8 },
    ],
  },
  {
    id: 'same',
    name: 'Equal Weight',
    muscleGroup: 'Espalda',
    logs: [
      { date: '2026-01-01', weight: 100, reps: 8 },
      { date: '2026-01-10', weight: 100, reps: 10 },
    ],
  },
  {
    id: 'down',
    name: 'Reps Down',
    muscleGroup: 'Pierna',
    logs: [
      { date: '2026-01-01', weight: 90, reps: 10 },
      { date: '2026-01-10', weight: 85, reps: 8 },
    ],
  },
];

describe('InsightsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders shared progression states for weight and reps', () => {
    render(<InsightsScreen exercises={exercises} onSelectExercise={vi.fn()} />);

    expect(getProgressState(100, 120)).toBe('up');
    expect(getProgressState(100, 100)).toBe('same');
    expect(getProgressState(100, 80)).toBe('down');
    expect(getProgressVariant('up')).toBe('success');
    expect(getProgressVariant('same')).toBe('neutral');
    expect(getProgressVariant('down')).toBe('danger');

    expect(screen.getByText('Your recent changes')).toBeTruthy();
    expect(screen.getByText('Top weight')).toBeTruthy();
    expect(screen.getAllByText('100 → 120')).toHaveLength(2);
    expect(screen.getAllByText('6 → 8')).toHaveLength(2);

    expect(screen.getAllByText('Weight Up')).toHaveLength(3);
    expect(screen.getAllByText('Equal Weight')).toHaveLength(2);
    expect(screen.getAllByText('Reps Down')).toHaveLength(2);
    expect(screen.getAllByText('120 kg', { selector: 'span' })).toHaveLength(1);
    expect(screen.getAllByText('100 kg', { selector: 'span' })).toHaveLength(1);
    expect(screen.getAllByText('8 reps', { selector: 'span' })).toHaveLength(2);
  });

  it('renders regressions mixed into the recent changes list', () => {
    render(<InsightsScreen exercises={exercises} onSelectExercise={vi.fn()} />);

    expect(screen.getByText('Your recent changes')).toBeTruthy();
    expect(screen.getAllByText('Reps Down').length).toBeGreaterThanOrEqual(1);
  });

  it('renders featured card with the latest insight', () => {
    render(<InsightsScreen exercises={exercises} onSelectExercise={vi.fn()} />);

    expect(screen.getByText('Latest change')).toBeTruthy();
    expect(screen.queryByText('View detail')).toBeNull();
  });

  it('calls onSelectExercise when a progression card is clicked', () => {
    const onSelectExercise = vi.fn();
    render(<InsightsScreen exercises={exercises} onSelectExercise={onSelectExercise} />);

    const cards = screen.getAllByText('Weight Up');
    fireEvent.click(cards[0]);

    expect(onSelectExercise).toHaveBeenCalledWith('up');
  });

  it('calls onSelectExercise when featured card is clicked', () => {
    const onSelectExercise = vi.fn();
    render(<InsightsScreen exercises={exercises} onSelectExercise={onSelectExercise} />);

    const featured = screen.getByText('Latest change').closest('section');
    const card = featured?.querySelector('[class*="rounded-2xl"]');
    if (card) fireEvent.click(card);

    expect(onSelectExercise).toHaveBeenCalled();
  });

  it('keeps the empty state when there are no progression logs', () => {
    render(<InsightsScreen exercises={[]} onSelectExercise={vi.fn()} />);

    expect(screen.getByText(/No progressions|Sin progresos/i)).toBeTruthy();
    expect(screen.getByText(/Start logging exercises to see your progress|Empieza a registrar ejercicios para ver tu progreso/i)).toBeTruthy();
  });
});
