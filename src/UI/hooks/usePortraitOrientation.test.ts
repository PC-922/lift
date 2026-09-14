import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePortraitOrientation } from './usePortraitOrientation';

describe('usePortraitOrientation', () => {
  it('requests portrait orientation on mount', async () => {
    const lock = vi.fn(() => Promise.resolve());
    Object.defineProperty(window.screen, 'orientation', {
      configurable: true,
      value: { lock },
    });

    renderHook(() => usePortraitOrientation());

    expect(lock).toHaveBeenCalledWith('portrait');
  });
});
