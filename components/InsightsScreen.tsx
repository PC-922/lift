import React, { useMemo } from 'react';
import { Exercise } from '../types';
import { getRecentProgressions } from '../utils/progression';
import { getTopWeightExercises } from '../utils/insights';
import { useTranslations, getTranslatedGroupName } from '../utils/translations';
import { BarChart3 } from 'lucide-react';
import { Badge } from './ui/Badge';
import { ListRow } from './ui/ListRow';

type ProgressState = 'up' | 'same' | 'down';

export const getProgressState = (previous: number, current: number): ProgressState => {
  if (current > previous) return 'up';
  if (current < previous) return 'down';
  return 'same';
};

export const getProgressVariant = (state: ProgressState) => {
  if (state === 'up') return 'success';
  if (state === 'down') return 'danger';
  return 'neutral';
};

interface Props {
  exercises: Exercise[];
}

export const InsightsScreen: React.FC<Props> = ({ exercises }) => {
  const t = useTranslations();
  const recentProgressions = getRecentProgressions(exercises, 3);
  const topWeightExercises = getTopWeightExercises(exercises, 3);

  const hasInsights = recentProgressions.length > 0 || topWeightExercises.length > 0;

  const renderProgressMetric = (label: string, previous: number, current: number) => {
    return (
      <div className="flex items-center gap-2">
        <span className="w-10 text-xs text-app-text-muted">{label}</span>
        <Badge variant="accent" className="rounded-lg px-2.5 py-1 text-sm">
          {previous} → {current}
        </Badge>
      </div>
    );
  };

  const renderValueMetric = (label: string, value: string) => (
    <div className="flex items-center gap-2">
      <span className="w-10 text-xs text-app-text-muted">{label}</span>
      <Badge variant="accent" className="rounded-lg px-2.5 py-1 text-sm">
        {value}
      </Badge>
    </div>
  );

  const renderEmpty = () => (
    <div className="py-16 text-center opacity-60">
      <BarChart3 className="mx-auto mb-4 text-app-text-muted" size={48} />
      <p className="font-medium text-app-text">{t.labels.noInsights || 'No progressions yet'}</p>
      <p className="mt-2 text-sm text-app-text-muted">{t.labels.noInsightsDesc || 'Start logging exercises to see your progress'}</p>
    </div>
  );

  const renderRecentList = () => {
    if (recentProgressions.length === 0) return renderEmpty();

    return (
      <div className="space-y-3">
        {recentProgressions.map((progression) => (
          <ListRow key={progression.exerciseId}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-base font-semibold text-app-text">{progression.exerciseName}</h3>
                <p className="mt-0.5 text-xs uppercase tracking-wide text-app-text-muted">{getTranslatedGroupName(progression.muscleGroup)}</p>
              </div>
              <Badge variant="accent" className="flex-shrink-0 whitespace-nowrap px-3 py-1.5 text-xs">
                {progression.progressionText}
              </Badge>
            </div>
             <div className="mt-3 flex flex-col gap-1.5">
               {progression.detail.type !== 'reps' && renderProgressMetric('kg', progression.detail.prevWeight, progression.detail.currWeight)}
               {progression.detail.type !== 'weight' && renderProgressMetric('reps', progression.detail.prevReps, progression.detail.currReps)}
             </div>
          </ListRow>
        ))}
      </div>
    );
  };

  const renderTopWeightList = () => {
    if (topWeightExercises.length === 0) return renderEmpty();

    return (
      <div className="space-y-3">
        {topWeightExercises.map((exercise) => (
          <ListRow key={exercise.exerciseId}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-app-text">{exercise.exerciseName}</h3>
                <p className="mt-0.5 text-xs uppercase tracking-wide text-app-text-muted">{getTranslatedGroupName(exercise.muscleGroup)}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
                  <div>
                    {renderValueMetric('kg', `${exercise.weight} kg`)}
                  </div>
                  <div>
                    {renderValueMetric('reps', `${exercise.reps} rep${exercise.reps !== 1 ? 's' : ''}`)}
                  </div>
                </div>
              </div>
            </div>
          </ListRow>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {hasInsights ? (
        <>
          {recentProgressions.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-app-text">{t.labels.recentProgress}</h2>
                  <p className="mt-1 text-sm text-app-text-muted">{t.labels.noInsightsDesc || 'Start logging exercises to see your progress'}</p>
                </div>
              </div>
              {renderRecentList()}
            </section>
          )}

          {topWeightExercises.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-app-text">{t.labels.topWeightExercises}</h2>
                  <p className="mt-1 text-sm text-app-text-muted">{t.labels.noInsightsDesc || 'Start logging exercises to see your progress'}</p>
                </div>
              </div>
              {renderTopWeightList()}
            </section>
          )}
        </>
      ) : (
        renderEmpty()
      )}
    </div>
  );
};
