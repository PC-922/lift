import { describe, it, expect, vi, beforeEach, afterEach, type MockedFunction } from 'vitest';
import { registerPwaUpdate } from './pwaUpdates';

describe('registerPwaUpdate', () => {
  let updateSW: MockedFunction<(reloadPage?: boolean) => Promise<void>>;
  let swRegistration: ServiceWorkerRegistration;
  let updateCheckMock: MockedFunction<() => Promise<void>>;
  let hidden: boolean;
  let visibilityState: DocumentVisibilityState;
  const listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();

  beforeEach(() => {
    vi.useFakeTimers();
    updateSW = vi.fn().mockResolvedValue(undefined);

    updateCheckMock = vi.fn().mockResolvedValue(undefined);
    swRegistration = {
      update: updateCheckMock,
    } as unknown as ServiceWorkerRegistration;

    hidden = false;
    visibilityState = 'visible';
    listeners.clear();

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => hidden,
    });

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibilityState,
    });

    vi.spyOn(document, 'addEventListener').mockImplementation((type, listener) => {
      const set = listeners.get(type) ?? new Set();
      set.add(listener as EventListenerOrEventListenerObject);
      listeners.set(type, set);
    });

    vi.spyOn(document, 'removeEventListener').mockImplementation((type, listener) => {
      listeners.get(type)?.delete(listener as EventListenerOrEventListenerObject);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function dispatchVisibilityChange() {
    listeners.get('visibilitychange')?.forEach((listener) => {
      if (typeof listener === 'function') {
        listener(new Event('visibilitychange'));
      } else {
        listener.handleEvent(new Event('visibilitychange'));
      }
    });
  }

  it('does not reload while the app is visible and reloads when it goes to background', () => {
    const { onNeedRefresh } = registerPwaUpdate(updateSW);
    onNeedRefresh();

    expect(updateSW).not.toHaveBeenCalled();

    hidden = true;
    visibilityState = 'hidden';
    dispatchVisibilityChange();

    expect(updateSW).toHaveBeenCalledTimes(1);
    expect(updateSW).toHaveBeenCalledWith(true);
  });

  it('reloads immediately when the update is detected while the app is already hidden', () => {
    hidden = true;
    visibilityState = 'hidden';

    const { onNeedRefresh } = registerPwaUpdate(updateSW);
    onNeedRefresh();

    expect(updateSW).toHaveBeenCalledTimes(1);
    expect(updateSW).toHaveBeenCalledWith(true);
  });

  it('checks for updates every hour and when the app becomes visible', () => {
    const { onRegistered } = registerPwaUpdate(updateSW);
    onRegistered(swRegistration);

    expect(updateCheckMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(60 * 60 * 1000);
    expect(updateCheckMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(60 * 60 * 1000);
    expect(updateCheckMock).toHaveBeenCalledTimes(2);

    dispatchVisibilityChange();
    expect(updateCheckMock).toHaveBeenCalledTimes(3);
  });
});
