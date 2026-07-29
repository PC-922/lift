import React, { act } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RestTimer } from './RestTimer';
import { RestTimerProvider } from '../hooks/useRestTimer';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <RestTimerProvider>{children}</RestTimerProvider>
);

describe('RestTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders an anchored bar when a duration is set', () => {
    render(<RestTimer />, { wrapper });

    expect(screen.getByText('1:30')).toBeTruthy();
  });

  it('opens the expanded control sheet when the bar is tapped and closes it with the X button', () => {
    render(<RestTimer />, { wrapper });

    fireEvent.click(screen.getByLabelText(/rest timer/i));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();

    fireEvent.click(within(dialog).getByLabelText(/close/i));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('updates the timer when a preset chip is selected', () => {
    render(<RestTimer />, { wrapper });

    fireEvent.click(screen.getByLabelText(/rest timer/i));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(screen.getByText('60s'));

    expect(within(dialog).getByText('1:00')).toBeTruthy();
  });

  it('counts down after starting and pauses after stopping', () => {
    render(<RestTimer />, { wrapper });

    fireEvent.click(screen.getByLabelText(/rest timer/i));
    fireEvent.click(screen.getByText('90s'));
    fireEvent.click(screen.getByLabelText(/resume/i));
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getAllByText('1:28').length).toBe(2);

    fireEvent.click(screen.getAllByLabelText(/pause/i)[0]);
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getAllByText('1:28').length).toBe(2);
  });
});
