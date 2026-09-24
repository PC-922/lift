import React, { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '../utils/cn';
import { useTranslations } from '../utils/translations';

interface ExerciseMediaProps {
  exerciseId: string;
  exerciseName: string;
  compact?: boolean;
  className?: string;
}

export const getExerciseGifUrl = (exerciseId: string): string => `/exercise-media/${exerciseId}.gif`;

export const ExerciseMedia: React.FC<ExerciseMediaProps> = ({
  exerciseId,
  exerciseName,
  compact = false,
  className,
}) => {
  const t = useTranslations();
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    setHasFailed(false);
  }, [exerciseId]);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-app-border bg-app-surface-muted',
        compact ? 'aspect-[16/9]' : 'aspect-[16/10]',
        className
      )}
    >
      {hasFailed ? (
        <div role="status" className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-app-border bg-app-surface text-app-text-muted">
            <ImageOff size={18} aria-hidden="true" />
          </span>
          <span className="text-xs font-semibold text-app-text">{t.labels.exerciseMediaUnavailable}</span>
          <span className="text-xs text-app-text-muted">{t.labels.exerciseMediaInstruction.replace('{file}', `${exerciseId}.gif`)}</span>
        </div>
      ) : (
        <img
          src={getExerciseGifUrl(exerciseId)}
          alt={`${exerciseName} exercise demonstration`}
          onError={() => setHasFailed(true)}
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
};
