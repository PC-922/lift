import React from 'react';
import { Hourglass, Pause, Play, RotateCcw, Square, X } from 'lucide-react';
import { useRestTimer } from '../hooks/useRestTimer';
import { useTranslations } from '../utils/translations';
import { Button } from './ui/Button';
import { Modal } from './Modal';
import { cn } from '../utils/cn';

export const RestTimer: React.FC = () => {
  const {
    remainingTime,
    isActive,
    stopTimer,
    resetTimer,
    startTimer,
    addTime,
    selectDuration,
    isMinimized,
    setMinimized,
    duration,
  } = useRestTimer();
  const t = useTranslations();

  const hasTimer = remainingTime > 0 || duration > 0;
  const displaySeconds = isActive || remainingTime > 0 ? remainingTime : duration;
  const minutes = Math.floor(displaySeconds / 60);
  const seconds = displaySeconds % 60;
  const displayTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const openExpanded = () => setMinimized(false);
  const closeExpanded = () => setMinimized(true);
  const dismissTimer = () => {
    stopTimer();
    selectDuration(0);
  };

  if (!hasTimer) {
    return null;
  }

  return (
    <>
      <div
        className="fixed left-0 right-0 z-40 border-t border-app-border bg-app-surface px-4 py-2"
        style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <button
            onClick={openExpanded}
            className="flex min-w-0 flex-1 items-center gap-3 text-left active:opacity-70"
            aria-label={t.labels.restTimer}
          >
            <Hourglass
              className={cn(
                'h-5 w-5 shrink-0 text-app-accent-text',
                isActive && 'animate-pulse'
              )}
            />
            <span className="text-2xl font-bold tabular-nums text-app-text">
              {displayTime}
            </span>
          </button>

          <div className="flex items-center gap-2">
            {isActive ? (
              <button
                onClick={stopTimer}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-app-surface-muted text-app-text active:opacity-70"
                aria-label={t.labels.restPause}
              >
                <Pause className="h-5 w-5 fill-current" />
              </button>
            ) : (
              <button
                onClick={startTimer}
                disabled={displaySeconds <= 0}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-app-accent text-app-accent-foreground active:opacity-70 disabled:opacity-40"
                aria-label={t.labels.restResume}
              >
                <Play className="h-5 w-5 fill-current" />
              </button>
            )}
            <button
              onClick={dismissTimer}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-app-surface-muted text-app-text-muted active:opacity-70"
              aria-label={t.actions.close}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <Modal open={!isMinimized} onClose={closeExpanded} position="bottom">
        <div className="flex flex-col gap-6 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-app-text">{t.labels.restTimer}</h2>
            <button
              onClick={closeExpanded}
              className="rounded-full p-2 text-app-text-muted active:opacity-70"
              aria-label={t.actions.close}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="text-center text-6xl font-bold tabular-nums text-app-text">
            {displayTime}
          </div>

          <div className="flex justify-center">
            {isActive ? (
              <Button
                variant="primary"
                size="lg"
                className="w-40"
                onClick={stopTimer}
              >
                <Pause className="h-5 w-5 fill-current" />
                {t.labels.restPause}
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                className="w-40"
                onClick={startTimer}
                disabled={displaySeconds <= 0}
              >
                <Play className="h-5 w-5 fill-current" />
                {t.labels.restResume}
              </Button>
            )}
          </div>

          {!isActive && (
            <div className="grid grid-cols-4 gap-2">
              {[60, 90, 120, 180].map((secondsOption) => (
                <button
                  key={secondsOption}
                  onClick={() => selectDuration(secondsOption)}
                  className={cn(
                    'rounded-lg px-2 py-3 text-sm font-semibold transition-colors active:opacity-70',
                    duration === secondsOption && remainingTime === secondsOption && !isActive
                      ? 'bg-app-text text-app-surface'
                      : 'bg-app-surface-muted text-app-text'
                  )}
                >
                  {secondsOption}s
                </button>
              ))}
            </div>
          )}

          {remainingTime > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="secondary"
                onClick={() => addTime(30)}
              >
                +30s
              </Button>
              <Button
                variant="secondary"
                onClick={resetTimer}
                aria-label="Reset timer"
              >
                <RotateCcw className="h-5 w-5" />
              </Button>
              <Button
                variant="destructive"
                onClick={stopTimer}
                aria-label={t.labels.restStop}
              >
                <Square className="h-5 w-5 fill-current" />
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};
