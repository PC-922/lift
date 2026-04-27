import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { RestTimerProvider, useRestTimer } from './useRestTimer';

describe('useRestTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <RestTimerProvider>{children}</RestTimerProvider>
  );

  it('debe iniciar el temporizador correctamente', () => {
    const { result } = renderHook(() => useRestTimer(), { wrapper });

    act(() => {
      result.current.startTimer(60);
    });

    expect(result.current.remainingTime).toBe(60);
    expect(result.current.isActive).toBe(true);
  });

  it('debe disminuir el tiempo con cada segundo', () => {
    const { result } = renderHook(() => useRestTimer(), { wrapper });

    act(() => {
      result.current.startTimer(60);
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.remainingTime).toBe(59);
  });

  it('debe detenerse al llegar a cero', () => {
    const { result } = renderHook(() => useRestTimer(), { wrapper });

    act(() => {
      result.current.startTimer(1);
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.remainingTime).toBe(0);
    expect(result.current.isActive).toBe(false);
  });

  it('debe permitir añadir tiempo extra', () => {
    const { result } = renderHook(() => useRestTimer(), { wrapper });

    act(() => {
      result.current.startTimer(60);
    });

    act(() => {
      result.current.addTime(30);
    });

    expect(result.current.remainingTime).toBe(90);
  });

  it('debe expandirse al resetear y permitir minimizarse', () => {
    const { result } = renderHook(() => useRestTimer(), { wrapper });

    // Inicia minimizado por defecto
    expect(result.current.isMinimized).toBe(true);

    act(() => {
      result.current.resetTimer();
    });

    // Al resetear debe expandirse
    expect(result.current.isMinimized).toBe(false);

    act(() => {
      result.current.setMinimized(true);
    });

    expect(result.current.isMinimized).toBe(true);
  });
});
