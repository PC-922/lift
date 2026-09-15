import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Exercise, WorkoutEntry } from '../../domain';
import { translations } from '../messages';
import { WorkoutEntryEditor } from './WorkoutEntryEditor';

const exercises: Exercise[] = [
  { id: 'press', name: 'Bench Press', muscleGroup: 'Chest', logs: [] },
];

function renderEditor(entry: WorkoutEntry, onExerciseChange = vi.fn()) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 375 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 667 });
  render(
    <WorkoutEntryEditor
      entry={entry}
      entryIndex={0}
      exercises={exercises}
      onExerciseChange={onExerciseChange}
      onRemoveExercise={vi.fn()}
      onAddSet={vi.fn()}
      onUpdateSet={vi.fn()}
      onRemoveSet={vi.fn()}
    />
  );
  return onExerciseChange;
}

describe('WorkoutEntryEditor', () => {
  it('allows changing an exercise in a compact mobile viewport', () => {
    const onExerciseChange = renderEditor({ exerciseId: 'deleted', exerciseName: 'Pullover', sets: [] });

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'press' } });

    expect(onExerciseChange).toHaveBeenCalledWith('press');
  });

  it('shows the saved name when the original exercise has been deleted', () => {
    renderEditor({ exerciseId: 'deleted', exerciseName: 'Pullover', sets: [] });

    expect(screen.getByRole('option', { name: 'Pullover' })).toBeTruthy();
  });

  it('labels legacy history instead of rendering an empty selector', () => {
    renderEditor({ exerciseId: 'deleted', sets: [] });

    const labels = [translations.es.labels.deletedExercise, translations.en.labels.deletedExercise];
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(labels).toContain(select.selectedOptions[0].textContent);
  });
});
