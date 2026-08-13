import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { BottomNav } from './BottomNav';
import { t } from '../utils/translations';

describe('BottomNav', () => {
  it('renders all five navigation items', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <BottomNav />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: t.labels.home })).toBeTruthy();
    expect(screen.getByRole('link', { name: t.labels.insights })).toBeTruthy();
    expect(screen.getByRole('link', { name: t.labels.workout })).toBeTruthy();
    expect(screen.getByRole('link', { name: t.labels.routines })).toBeTruthy();
    expect(screen.getByRole('link', { name: t.labels.settings })).toBeTruthy();
  });

  it('links to the workout route', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <BottomNav />
      </MemoryRouter>
    );

    const workoutLink = screen.getByRole('link', { name: t.labels.workout });
    expect(workoutLink.getAttribute('href')).toBe('/workout');
  });

  it('centers the active label below all icons without an active indicator', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/routines']}>
        <BottomNav />
      </MemoryRouter>
    );

    expect(screen.getByText(t.labels.routines)).toBeTruthy();
    expect(screen.queryByText(t.labels.home)).toBeNull();
    expect(screen.getByRole('link', { name: t.labels.routines }).className).toContain('bottom-nav-active');
    expect(container.querySelector('.bottom-nav-label')?.parentElement?.className).toContain('justify-center');
    expect(container.querySelector('.bottom-nav-divider')).toBeTruthy();
    expect(container.querySelector('.bottom-nav-indicator')).toBeNull();
  });
});
