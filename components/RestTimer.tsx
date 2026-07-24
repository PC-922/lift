import React, { useState } from 'react';
import { Hourglass, Pause, Play, RotateCcw, Square, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useRestTimer } from '../hooks/useRestTimer';
import { useTranslations } from '../utils/translations';
import { Button } from './ui/Button';
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
  const [isCollapsed, setIsCollapsed] = useState(false);

  const minutes = Math.floor(remainingTime / 60);
  const seconds = remainingTime % 60;
  const displayTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const durationMinutes = Math.floor(duration / 60);
  const durationSeconds = duration % 60;
  const displayDuration = `${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}`;

  if (isMinimized) {
    return (
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] left-6 z-40 animate-in fade-in zoom-in duration-300 pointer-events-none">
        <Button
          variant="primary"
          onClick={() => setMinimized(false)}
          data-testid="rest-timer-minimized"
          className="h-14 w-14 rounded-full shadow-lg border-2 border-app-accent pointer-events-auto flex items-center justify-center p-0"
        >
          <div className="relative">
            <Hourglass className={cn('w-6 h-6 text-app-accent-foreground', isActive && 'animate-pulse')} />
            {remainingTime > 0 && (
              <span className="absolute -top-3 -right-3 flex h-6 min-w-6 items-center justify-center rounded-full bg-app-danger px-1.5 text-[10px] font-black text-white border-2 border-app-bg shadow-sm">
                {remainingTime}
              </span>
            )}
          </div>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn(
      "fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] left-4 right-4 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-none transition-all",
      isCollapsed ? "bottom-[calc(env(safe-area-inset-bottom)+4.5rem)]" : ""
    )}>
      <div className={cn(
        "mx-auto max-w-sm shadow-xl border border-app-border bg-app-surface backdrop-blur-xl flex flex-col pointer-events-auto overflow-hidden rounded-[2rem] transition-all duration-300",
        isCollapsed ? "gap-0 p-3" : "gap-5 p-5"
      )}>
        <div className="flex flex-col items-center relative">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -top-1 left-0 p-2 text-app-text-muted hover:text-app-text transition-colors"
            aria-label={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          <button
            onClick={() => setMinimized(true)}
            data-testid="rest-timer-close"
            className="absolute -top-1 right-0 p-2 text-app-text-muted hover:text-app-danger transition-colors"
            aria-label={t.actions.close}
          >
            <X size={20} />
          </button>

          <div
            className={cn(
              "flex flex-col items-center cursor-pointer active:opacity-70 transition-all",
              isCollapsed ? "flex-row gap-3" : "mt-1"
            )}
            onClick={() => setMinimized(true)}
            role="button"
            aria-label={t.actions.close}
          >
            <span className={cn(
              "font-black tracking-tighter text-app-text font-mono leading-none transition-all",
              isCollapsed ? "text-2xl" : "text-6xl"
            )}>
              {remainingTime > 0 ? displayTime : displayDuration}
            </span>
          </div>
        </div>

        {!isCollapsed && (
          <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-center w-full">
              {isActive ? (
                <Button
                  variant="primary"
                  size="lg"
                  className="w-32 h-12 rounded-full shadow-md font-black uppercase tracking-widest text-xs"
                  onClick={stopTimer}
                >
                  <Pause className="w-4 h-4 mr-1 fill-current text-app-accent-foreground" />
                  {t.labels.restPause}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  className="w-32 h-12 rounded-full shadow-md font-black uppercase tracking-widest text-xs"
                  onClick={startTimer}
                  disabled={remainingTime <= 0}
                >
                  <Play className="w-4 h-4 mr-1 fill-current text-app-accent-foreground" />
                  {t.labels.restResume}
                </Button>
              )}
            </div>

            {!isActive && (
              <div className="grid grid-cols-4 gap-2 w-full px-2">
                {[60, 90, 120, 180].map((s) => (
                  <Button
                    key={s}
                    variant="ghost"
                    onClick={() => selectDuration(s)}
                    className={cn(
                      "h-11 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-none w-full",
                      duration === s && remainingTime === s && !isActive
                        ? "bg-app-accent text-app-accent-foreground"
                        : "bg-app-surface-muted text-app-text-muted"
                    )}
                  >
                    {s}s
                  </Button>
                ))}
              </div>
            )}

            {remainingTime > 0 && (
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="secondary"
                  className="h-12 w-16 rounded-2xl p-0 flex items-center justify-center bg-app-surface-muted border-transparent shadow-none active:scale-95"
                  onClick={() => addTime(30)}
                  aria-label="+30s"
                >
                  <span className="text-xs font-black">+30s</span>
                </Button>

                <Button
                  variant="secondary"
                  className="h-12 w-16 rounded-2xl p-0 flex items-center justify-center bg-app-surface-muted border-transparent shadow-none active:scale-95"
                  onClick={resetTimer}
                  aria-label="Reset timer"
                >
                  <RotateCcw className="w-4 h-4 text-app-text" />
                </Button>

                <Button
                  variant="destructive"
                  className="h-12 w-16 rounded-2xl p-0 flex items-center justify-center shadow-none active:scale-95"
                  onClick={stopTimer}
                  aria-label={t.labels.restStop}
                >
                  <Square className="w-4 h-4 fill-current text-white" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
