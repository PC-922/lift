import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SyncIndicator } from './SyncIndicator';

const { syncStatusMock } = vi.hoisted(() => ({
  syncStatusMock: { value: null as { hasPendingWrites: boolean; fromCache: boolean } | null },
}));

vi.mock('../hooks/useAppData', () => ({
  useAppData: () => ({ syncStatus: syncStatusMock.value }),
}));

describe('SyncIndicator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    syncStatusMock.value = null;
    Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when there is no pending write', () => {
    syncStatusMock.value = { hasPendingWrites: false, fromCache: false };
    render(<SyncIndicator />);
    expect(screen.queryByText('Syncing')).toBeNull();
  });

  it('shows Syncing while there are pending writes and hides it after a while', () => {
    syncStatusMock.value = { hasPendingWrites: true, fromCache: false };
    render(<SyncIndicator />);
    expect(screen.getByText('Syncing')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.queryByText('Syncing')).toBeNull();
  });

  it('shows Offline when reading from cache without a connection', () => {
    syncStatusMock.value = { hasPendingWrites: true, fromCache: true };
    Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });

    render(<SyncIndicator />);

    expect(screen.getByText('Offline')).toBeTruthy();
    expect(screen.queryByText('Syncing')).toBeNull();
  });
});
