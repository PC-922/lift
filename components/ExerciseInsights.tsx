import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Exercise } from '../types';
import { useTranslations, getTranslatedGroupName } from '../utils/translations';
import { getProgressionDetail, getRegressionDetail } from '../utils/progression';
import { Badge } from './ui/Badge';
import { ListRow } from './ui/ListRow';

const CHART_WIDTH = 320;
const CHART_HEIGHT = 160;
const PADDING = { top: 20, right: 20, bottom: 30, left: 40 };

interface ChartPoint {
  date: string;
  value: number;
}

function buildLineChart(points: ChartPoint[], colorClass: string): React.ReactNode {
  if (points.length < 2) return null;

  const values = points.map((p) => p.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  const innerWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const xForIndex = (index: number) => PADDING.left + (index / (points.length - 1)) * innerWidth;
  const yForValue = (value: number) => PADDING.top + innerHeight - ((value - minValue) / range) * innerHeight;

  const pathD = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${xForIndex(index)} ${yForValue(point.value)}`)
    .join(' ');

  return (
    <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const y = PADDING.top + innerHeight * (1 - ratio);
        const value = Math.round(minValue + range * ratio);
        return (
          <g key={ratio}>
            <line x1={PADDING.left} y1={y} x2={CHART_WIDTH - PADDING.right} y2={y} className="stroke-app-border" strokeWidth="1" />
            <text x={PADDING.left - 8} y={y + 4} className="fill-app-text-muted text-[10px]" textAnchor="end">{value}</text>
          </g>
        );
      })}

      <path d={pathD} fill="none" className={colorClass} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {points.map((point, index) => (
        <g key={point.date}>
          <circle cx={xForIndex(index)} cy={yForValue(point.value)} r="4" className={`fill-app-surface stroke-2 ${colorClass}`} />
          <text x={xForIndex(index)} y={CHART_HEIGHT - 6} className="fill-app-text-muted text-[9px]" textAnchor="middle">
            {new Date(point.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </text>
        </g>
      ))}
    </svg>
  );
}

interface Props {
  exercise: Exercise;
}

export const ExerciseInsights: React.FC<Props> = ({ exercise }) => {
  const t = useTranslations();

  const sortedLogs = useMemo(() => {
    return [...exercise.logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [exercise.logs]);

  const weightPoints: ChartPoint[] = useMemo(() =>
    sortedLogs
      .filter((log) => log.weight !== null)
      .map((log) => ({ date: log.date, value: log.weight as number })),
    [sortedLogs]
  );

  const repsPoints: ChartPoint[] = useMemo(() =>
    sortedLogs
      .filter((log) => log.reps !== null)
      .map((log) => ({ date: log.date, value: log.reps as number })),
    [sortedLogs]
  );

  const progression = useMemo(() => getProgressionDetail(exercise.logs), [exercise.logs]);
  const regression = useMemo(() => getRegressionDetail(exercise.logs), [exercise.logs]);

  const latestLog = sortedLogs.length > 0 ? sortedLogs[sortedLogs.length - 1] : null;

  if (sortedLogs.length < 2) {
    return (
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-app-text">{t.labels.insights}</h2>
        <p className="text-sm text-app-text-muted">{t.labels.noInsightsDesc}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-app-text">{t.labels.insights}</h2>
        <p className="text-xs uppercase tracking-wide text-app-text-muted">{getTranslatedGroupName(exercise.muscleGroup)}</p>
      </div>

      {latestLog && (
        <ListRow>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-app-text-muted uppercase tracking-wide">{t.labels.maxWeight}</p>
              <p className="text-xl font-bold text-app-text">
                {latestLog.weight !== null ? `${latestLog.weight} kg` : '—'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-app-text-muted uppercase tracking-wide">{t.labels.reps}</p>
              <p className="text-xl font-bold text-app-text">
                {latestLog.reps !== null ? `${latestLog.reps}` : '—'}
              </p>
            </div>
          </div>
        </ListRow>
      )}

      {(progression || regression) && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-app-text">{t.labels.recentProgress}</h3>
          <div className="space-y-2">
            {[progression, regression]
              .filter(Boolean)
              .sort((a, b) => new Date(b!.date).getTime() - new Date(a!.date).getTime())
              .map((change) => {
                const isRegression = change === regression;
                const Icon = isRegression ? TrendingDown : TrendingUp;
                return (
                  <ListRow
                    key={change!.date}
                    className={`border ${isRegression ? 'border-app-danger/30 bg-app-danger/5' : 'border-app-success/30 bg-app-success/5'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-app-text">{change!.timeSince}</p>
                        <div className="mt-2 flex gap-4 text-sm">
                          {change!.type !== 'reps' && (
                            <span className="text-app-text-muted">{change!.prevWeight} kg → <span className={`font-semibold ${isRegression ? 'text-app-danger' : 'text-app-success'}`}>{change!.currWeight} kg</span></span>
                          )}
                          {change!.type !== 'weight' && (
                            <span className="text-app-text-muted">{change!.prevReps} reps → <span className={`font-semibold ${isRegression ? 'text-app-danger' : 'text-app-success'}`}>{change!.currReps} reps</span></span>
                          )}
                        </div>
                      </div>
                      <Badge variant={isRegression ? 'danger' : 'success'} className="flex-shrink-0 whitespace-nowrap px-3 py-1.5 text-xs">
                        <Icon size={12} className="mr-1 inline" />
                        {change!.timeSince}
                      </Badge>
                    </div>
                  </ListRow>
                );
              })}
          </div>
        </div>
      )}

      {weightPoints.length >= 2 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-app-text">{t.labels.weightTrend}</h3>
          <div className="rounded-2xl border border-app-border bg-app-surface p-4">
            {buildLineChart(weightPoints, 'stroke-app-accent-text')}
          </div>
        </div>
      )}

      {repsPoints.length >= 2 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-app-text">{t.labels.repsTrend}</h3>
          <div className="rounded-2xl border border-app-border bg-app-surface p-4">
            {buildLineChart(repsPoints, 'stroke-app-success')}
          </div>
        </div>
      )}
    </div>
  );
};
