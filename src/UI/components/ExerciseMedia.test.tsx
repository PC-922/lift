import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ExerciseMedia } from './ExerciseMedia';

describe('ExerciseMedia', () => {
  it('resolves a default GIF from the exercise id without a manifest', () => {
    render(<ExerciseMedia exerciseId="bench-press" exerciseName="Bench Press" />);

    const media = screen.getByRole('img', { name: 'Bench Press exercise demonstration' });
    expect(media.getAttribute('src')).toBe('/exercise-media/bench-press.gif');
  });

  it('replaces a missing GIF with an accessible placeholder', () => {
    render(<ExerciseMedia exerciseId="custom-machine" exerciseName="Custom machine" />);

    fireEvent.error(screen.getByRole('img', { name: 'Custom machine exercise demonstration' }));

    expect(screen.getByRole('status').textContent).toContain('Exercise media unavailable');
    expect(screen.queryByRole('img', { name: 'Custom machine exercise demonstration' })).toBeNull();
  });

  it('keeps the compact media area usable in mobile viewports', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 375 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 667 });
    render(<ExerciseMedia exerciseId="squat" exerciseName="Squat" compact />);

    expect(screen.getByRole('img', { name: 'Squat exercise demonstration' }).parentElement?.className)
      .toContain('aspect-[16/9]');
  });
});
