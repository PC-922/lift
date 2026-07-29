import React, { useMemo } from 'react';
import { Exercise } from '../types';
import { getRecentProgressions, getRecentRegressions, RecentProgression, RecentRegression } from '../utils/progression';
import { getTopWeightExercises } from '../utils/insights';
import { useTranslations, getTranslatedGroupName } from '../utils/translations';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
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
  onSelectExercise: (exerciseId: string) => void;
}

type FeaturedInsight =
  | { kind: 'progression'; data: RecentProgression }
  | { kind: 'regression'; data: RecentRegression };

export const InsightsScreen: React.FC<Props> = ({ exercises, onSelectExercise }) => {
  const t = useTranslations();
  const recentProgressions = getRecentProgressions(exercises, 3);
  const recentRegressions = getRecentRegressions(exercises, 3);
  const topWeightExercises = getTopWeightExercises(exercises, 3);

  const featuredInsight: FeaturedInsight | null = useMemo(() => {
    const progression = recentProgressions[0] ?? null;
    const regression = recentRegressions[0] ?? null;
    if (!progression && !regression) return null;
    if (!progression) return { kind: 'regression', data: regression };
    if (!regression) return { kind: 'progression', data: progression };
    return new Date(progression.lastProgressionDate).getTime() >= new Date(regression.lastRegressionDate).getTime()
      ? { kind: 'progression', data: progression }
      : { kind: 'regression', data: regression };
  }, [recentProgressions, recentRegressions]);

  const hasInsights = recentProgressions.length > 0 || recentRegressions.length > 0 || topWeightExercises.length > 0;

  const renderProgressMetric = (label: string, previous: number, current: number) => (
    <div className="flex items-center gap-2">
      <span className="w-10 text-xs text-app-text-muted">{label}</span>
      <Badge variant="neutral" className="rounded-lg px-2.5 py-1 text-sm bg-app-surface-muted text-app-text-muted border-none">
        {previous} → {current}
      </Badge>
    </div>
  );

  const renderValueMetric = (label: string, value: string) => (
    <div className="flex items-center gap-2">
      {label && <span className="w-10 text-xs text-app-text-muted">{label}</span>}
      <Badge variant="neutral" className="rounded-lg px-2.5 py-1 text-sm bg-app-surface-muted text-app-text-muted border-none">
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

  const renderList = (
    items: (RecentProgression | RecentRegression)[],
    title: string,
    variant: 'success' | 'danger'
  ) => {
    if (items.length === 0) return null;
    const Icon = variant === 'danger' ? TrendingDown : TrendingUp;

    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-app-text">{title}</h2>
        <div className="space-y-3">
          {items.map((item) => {
            const badgeText = 'progressionText' in item ? item.progressionText : item.regressionText;
            return (
              <ListRow key={item.exerciseId} onClick={() => onSelectExercise(item.exerciseId)} className="cursor-pointer transition-colors active:bg-app-surface-muted">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-app-text">{item.exerciseName}</h3>
                    <p className="mt-0.5 text-xs uppercase tracking-wide text-app-text-muted">{getTranslatedGroupName(item.muscleGroup)}</p>
                  </div>
                  <Badge variant={variant} className="flex-shrink-0 whitespace-nowrap px-3 py-1.5 text-xs">
                    <Icon size={12} className="mr-1 inline" />
                    {badgeText}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-col gap-1.5">
                  {item.detail.type !== 'reps' && renderProgressMetric('kg', item.detail.prevWeight, item.detail.currWeight)}
                  {item.detail.type !== 'weight' && renderProgressMetric('reps', item.detail.prevReps, item.detail.currReps)}
                </div>
              </ListRow>
            );
          })}
        </div>
      </section>
    );
  };

  const renderFeaturedCard = () => {
    if (!featuredInsight) return null;

    const isRegression = featuredInsight.kind === 'regression';
    const data = featuredInsight.data;
    const Icon = isRegression ? TrendingDown : TrendingUp;
    const badgeVariant = isRegression ? 'danger' : 'success';
    const badgeText = isRegression ? (data as RecentRegression).regressionText : (data as RecentProgression).progressionText;

    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-app-text">{t.labels.latestInsight}</h2>
        <ListRow
          onClick={() => onSelectExercise(data.exerciseId)}
          className="cursor-pointer border border-app-border bg-app-surface transition-colors active:bg-app-surface-muted"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-app-text">{data.exerciseName}</h3>
              <p className="mt-0.5 text-xs uppercase tracking-wide text-app-text-muted">{getTranslatedGroupName(data.muscleGroup)}</p>
            </div>
            <Badge variant={badgeVariant} className="flex-shrink-0 whitespace-nowrap px-3 py-1.5 text-xs">
              <Icon size={12} className="mr-1 inline" />
              {badgeText}
            </Badge>
          </div>
          <div className="mt-3 flex flex-col gap-1.5">
            {data.detail.type !== 'reps' && renderProgressMetric('kg', data.detail.prevWeight, data.detail.currWeight)}
            {data.detail.type !== 'weight' && renderProgressMetric('reps', data.detail.prevReps, data.detail.currReps)}
          </div>
          <div className="mt-3 text-xs font-medium text-app-accent-text">{t.labels.viewDetail}</div>
        </ListRow>
      </section>
    );
  };

  const renderTopWeightList = () => {
    if (topWeightExercises.length === 0) return null;

    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-app-text">{t.labels.topWeightExercises}</h2>
        <div className="space-y-3">
          {topWeightExercises.map((exercise) => (
            <ListRow key={exercise.exerciseId} onClick={() => onSelectExercise(exercise.exerciseId)} className="cursor-pointer transition-colors active:bg-app-surface-muted">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-app-text">{exercise.exerciseName}</h3>
                  <p className="mt-0.5 text-xs uppercase tracking-wide text-app-text-muted">{getTranslatedGroupName(exercise.muscleGroup)}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
                    <div>{renderValueMetric('', `${exercise.weight ?? '—'} kg`)}</div>
                    <div>{renderValueMetric('', `${exercise.reps ?? '—'} rep${exercise.reps !== 1 ? 's' : ''}`)}</div>
                  </div>
                </div>
              </div>
            </ListRow>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-6 pb-20">
      {hasInsights ? (
        <>
          {renderFeaturedCard()}
          {renderList(recentProgressions, t.labels.recentProgress, 'success')}
          {renderList(recentRegressions, t.labels.recentRegressions, 'danger')}
          {renderTopWeightList()}
        </>
      ) : (
        renderEmpty()
      )}
    </div>
  );
};
