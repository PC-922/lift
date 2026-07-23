import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RestTimer } from './RestTimer';
import { RestTimerProvider } from '../hooks/useRestTimer';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <RestTimerProvider>{children}</RestTimerProvider>
);

describe('RestTimer', () => {
  it('minimizes instead of disappearing when the close button is clicked', () => {
    render(<RestTimer />, { wrapper });

    fireEvent.click(screen.getByTestId('rest-timer-minimized'));
    expect(screen.getByTestId('rest-timer-close')).toBeTruthy();

    fireEvent.click(screen.getByTestId('rest-timer-close'));
    expect(screen.queryByTestId('rest-timer-close')).toBeNull();
    expect(screen.getByTestId('rest-timer-minimized')).toBeTruthy();
  });
});
