import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { RestTimerProvider, useRestTimer } from './useRestTimer';

describe('useRestTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <RestTimerProvider>{children}</RestTimerProvider>
  );

  it('debe seleccionar duración sin iniciar', () => {
    const { result } = renderHook(() => useRestTimer(), { wrapper });

    act(() => {
      result.current.selectDuration(60);
    });

    expect(result.current.remainingTime).toBe(60);
    expect(result.current.duration).toBe(60);
    expect(result.current.isActive).toBe(false);
  });

  it('debe iniciar el temporizador correctamente', () => {
    const { result } = renderHook(() => useRestTimer(), { wrapper });

    act(() => {
      result.current.selectDuration(60);
      result.current.startTimer();
    });

    expect(result.current.remainingTime).toBe(60);
    expect(result.current.isActive).toBe(true);
  });

  it('debe disminuir el tiempo con cada segundo', () => {
    const { result } = renderHook(() => useRestTimer(), { wrapper });

    act(() => {
      result.current.selectDuration(60);
      result.current.startTimer();
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.remainingTime).toBe(59);
  });

  it('debe sincronizarse al volver visible la app', () => {
    const { result } = renderHook(() => useRestTimer(), { wrapper });

    act(() => {
      result.current.selectDuration(60);
      result.current.startTimer();
    });

    act(() => {
      vi.advanceTimersByTime(15000);
    });

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current.remainingTime).toBe(45);
  });

  it('debe detenerse al llegar a cero', () => {
    const { result } = renderHook(() => useRestTimer(), { wrapper });

    act(() => {
      result.current.selectDuration(1);
      result.current.startTimer();
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.remainingTime).toBe(0);
    expect(result.current.isActive).toBe(false);
  });

  it('debe permitir añadir tiempo extra sin cambiar la duración', () => {
    const { result } = renderHook(() => useRestTimer(), { wrapper });

    act(() => {
      result.current.selectDuration(60);
      result.current.startTimer();
    });

    act(() => {
      result.current.addTime(30);
    });

    expect(result.current.remainingTime).toBe(90);
    expect(result.current.duration).toBe(60);
  });

  it('debe expandirse al resetear y permitir minimizarse', () => {
    const { result } = renderHook(() => useRestTimer(), { wrapper });

    // Inicia minimizado por defecto
    expect(result.current.isMinimized).toBe(true);

    act(() => {
      result.current.selectDuration(90);
      result.current.resetTimer();
    });

    // Al resetear debe expandirse y detenerse
    expect(result.current.isMinimized).toBe(false);
    expect(result.current.isActive).toBe(false);

    act(() => {
      result.current.setMinimized(true);
    });

    expect(result.current.isMinimized).toBe(true);
  });

  it('debe poder minimizarse y expandirse', () => {
    const { result } = renderHook(() => useRestTimer(), { wrapper });

    act(() => {
      result.current.setMinimized(true);
    });

    expect(result.current.isMinimized).toBe(true);

    act(() => {
      result.current.setMinimized(false);
    });

    expect(result.current.isMinimized).toBe(false);
  });
});
