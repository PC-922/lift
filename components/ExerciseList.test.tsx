import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExerciseList } from './ExerciseList';
import { Exercise } from '../types';

vi.mock('../utils/translations', async () => {
  const actual = await vi.importActual<typeof import('../utils/translations')>('../utils/translations');
  return {
    ...actual,
    useTranslations: () => actual.t,
    getTranslatedGroupName: (group: string) => group,
  };
});

vi.mock('../hooks/useLongPress', () => ({
  useLongPress: ({ onTap }: { onTap?: () => void }) => ({ onClick: onTap }),
}));

vi.mock('./ActionSheet', () => ({
  ActionSheet: ({ title }: { title: string }) => <div>{title}</div>,
}));

const exercises: Exercise[] = [
  { id: '1', name: 'Bench Press', muscleGroup: 'Pecho', logs: [] },
  { id: '2', name: 'Squat', muscleGroup: 'Pierna', logs: [] },
  { id: '3', name: 'Deadlift', muscleGroup: 'Espalda', logs: [] },
];

describe('ExerciseList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the exercise list as a responsive grid', () => {
    const { container } = render(
      <ExerciseList
        exercises={exercises}
        muscleGroups={['Pecho', 'Espalda']}
        onSelectExercise={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
        onMove={vi.fn()}
        onRenameGroup={vi.fn()}
        onDeleteGroup={vi.fn()}
      />
    );

    const grid = container.querySelector('.grid');
    expect(grid?.className).toContain('grid-cols-1');
    expect(grid?.className).toContain('sm:grid-cols-2');
    expect(screen.getByText('Bench Press')).toBeTruthy();
    expect(screen.getByText('Squat')).toBeTruthy();
  });
});
