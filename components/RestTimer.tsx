import React from 'react';
import {Pause, Play, Plus, RotateCcw, Square, Timer} from 'lucide-react';
import {useRestTimer} from '../hooks/useRestTimer';
import {useTranslations} from '../utils/translations';
import {Surface} from './ui/Surface';
import {Button} from './ui/Button';
import {cn} from '../utils/cn';

export const RestTimer: React.FC = () => {
  const { remainingTime, isActive, stopTimer, resetTimer, startTimer, addTime, isMinimized, setMinimized, duration } = useRestTimer();
  const t = useTranslations();

  const minutes = Math.floor(remainingTime / 60);
  const seconds = remainingTime % 60;
  const displayTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const durationMinutes = Math.floor(duration / 60);
  const durationSeconds = duration % 60;
  const displayDuration = `${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}`;

  if (isMinimized) {
    return (
      <div className="fixed bottom-28 left-4 z-40 animate-in fade-in zoom-in duration-300 pointer-events-none">
        <Button
          variant="primary"
          onClick={() => setMinimized(false)}
          className="h-12 w-12 rounded-full shadow-lg pointer-events-auto flex items-center justify-center p-0"
        >
          <div className="relative">
            <Timer className={cn("w-6 h-6", isActive && "animate-pulse")} />
            {remainingTime > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-app-danger px-1 text-[10px] font-bold text-white">
                {remainingTime}
              </span>
            )}
          </div>
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-28 left-4 right-4 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-none">
      <Surface className="mx-auto max-w-sm shadow-xl border-app-accent/20 flex flex-col gap-3 pointer-events-auto overflow-hidden">
        <div className="flex flex-col gap-1">
          <div 
            className="flex items-center justify-between"
          >
            <div 
              className="flex items-center gap-2 cursor-pointer active:opacity-70"
              onClick={() => setMinimized(true)}
              role="button"
              aria-label={t.actions.close}
            >
              <Timer className={cn("w-5 h-5", isActive ? "text-app-accent animate-pulse" : "text-app-text-muted")} />
              <span className="text-2xl font-mono font-bold tracking-tight text-app-text">
                {remainingTime > 0 ? displayTime : displayDuration}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {!isActive && remainingTime === 0 && (
                <div className="flex items-center gap-1">
                  {[60, 90, 120, 180].map((s) => (
                    <Button
                      key={s}
                      variant={duration === s ? "primary" : "ghost"}
                      size="sm"
                      onClick={() => startTimer(s)}
                      className="h-7 px-2 text-[10px]"
                    >
                      {s}s
                    </Button>
                  ))}
                </div>
              )}
              {remainingTime > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addTime(30)}
                  className="h-8 px-2 text-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5 mr-0.5" />
                  30s
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isActive ? (
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 h-9"
              onClick={stopTimer}
            >
              <Pause className="w-4 h-4 mr-2" />
              {t.labels.restPause}
            </Button>
          ) : remainingTime > 0 ? (
            <Button
              variant="primary"
              size="sm"
              className="flex-1 h-9"
              onClick={() => startTimer(remainingTime)}
            >
              <Play className="w-4 h-4 mr-2" />
              {t.labels.restResume}
            </Button>
          ) : null}
          {remainingTime > 0 && (
            <Button
              variant="secondary"
              size="sm"
              className="h-9 px-3"
              onClick={resetTimer}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
          {remainingTime > 0 && (
            <Button
              variant="destructive"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => startTimer(0)}
              aria-label={t.labels.restStop}
            >
              <Square className="w-4 h-4 fill-current" />
            </Button>
          )}
        </div>
      </Surface>
    </div>
  );
};
