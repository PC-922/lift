import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppData } from '../hooks/useAppData';
import { useTranslations, getTranslatedGroupName } from '../utils/translations';
import { getProgressionDetail, getRegressionDetail } from '../utils/progression';
import { BackButton } from './ui/BackButton';
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

export const InsightDetailScreen: React.FC = () => {
  const t = useTranslations();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { exercises } = useAppData();
  const exercise = id ? exercises.find((e) => e.id === id) : undefined;

  const sortedLogs = useMemo(() => {
    if (!exercise) return [];
    return [...exercise.logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [exercise]);

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

  const progression = useMemo(() => exercise ? getProgressionDetail(exercise.logs) : null, [exercise]);
  const regression = useMemo(() => exercise ? getRegressionDetail(exercise.logs) : null, [exercise]);

  if (!exercise) {
    return (
      <div className="animate-fadeIn space-y-6">
        <BackButton label={t.labels.insights} onClick={() => navigate('/insights')} />
        <p className="text-app-text-muted">{t.labels.noExercisesFound}</p>
      </div>
    );
  }

  const latestLog = sortedLogs.length > 0 ? sortedLogs[sortedLogs.length - 1] : null;

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="mb-6">
        <BackButton label={t.labels.insights} onClick={() => navigate('/insights')} />
      </div>

      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-app-text">{exercise.name}</h2>
        <p className="text-sm text-app-text-muted uppercase tracking-wide">{getTranslatedGroupName(exercise.muscleGroup)}</p>
      </div>

      {latestLog ? (
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
      ) : (
        <p className="text-app-text-muted">{t.labels.noLogs}</p>
      )}

      {progression && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-app-text">{t.labels.recentProgress}</h3>
          <ListRow className="border border-app-success/30 bg-app-success/5">
            <div className="space-y-1">
              <p className="text-sm text-app-text">{progression.timeSince}</p>
              <div className="flex gap-4 text-sm">
                {progression.type !== 'reps' && (
                  <span className="text-app-text-muted">{progression.prevWeight} kg → <span className="font-semibold text-app-success">{progression.currWeight} kg</span></span>
                )}
                {progression.type !== 'weight' && (
                  <span className="text-app-text-muted">{progression.prevReps} reps → <span className="font-semibold text-app-success">{progression.currReps} reps</span></span>
                )}
              </div>
            </div>
          </ListRow>
        </div>
      )}

      {regression && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-app-text">{t.labels.recentRegressions}</h3>
          <ListRow className="border border-app-danger/30 bg-app-danger/5">
            <div className="space-y-1">
              <p className="text-sm text-app-text">{regression.timeSince}</p>
              <div className="flex gap-4 text-sm">
                {regression.type !== 'reps' && (
                  <span className="text-app-text-muted">{regression.prevWeight} kg → <span className="font-semibold text-app-danger">{regression.currWeight} kg</span></span>
                )}
                {regression.type !== 'weight' && (
                  <span className="text-app-text-muted">{regression.prevReps} reps → <span className="font-semibold text-app-danger">{regression.currReps} reps</span></span>
                )}
              </div>
            </div>
          </ListRow>
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
