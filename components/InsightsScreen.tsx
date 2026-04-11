import React, { useMemo, useRef, useState } from 'react';
import { Exercise } from '../types';
import { getRecentProgressions } from '../utils/progression';
import { getTopWeightExercises } from '../utils/insights';
import { useTranslations, getTranslatedGroupName } from '../utils/translations';
import { BarChart3 } from 'lucide-react';
import { Badge } from './ui/Badge';
import { Surface } from './ui/Surface';

interface Props {
  exercises: Exercise[];
}

export const InsightsScreen: React.FC<Props> = ({ exercises }) => {
  const t = useTranslations();
  const recentProgressions = getRecentProgressions(exercises, 3);
  const topWeightExercises = getTopWeightExercises(exercises, 3);
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const slides = useMemo(
    () => [
      { id: 'recent', title: t.labels.recentProgress, count: recentProgressions.length },
      { id: 'topWeight', title: t.labels.topWeightExercises, count: topWeightExercises.length },
    ],
    [recentProgressions.length, topWeightExercises.length, t.labels.recentProgress, t.labels.topWeightExercises]
  );

  const handleScroll = () => {
    const container = carouselRef.current;
    if (!container) return;
    setActiveIndex(Math.round(container.scrollLeft / container.clientWidth));
  };

  const handleIndicatorClick = (index: number) => {
    const container = carouselRef.current;
    if (!container) return;
    container.scrollTo({ left: index * container.clientWidth, behavior: 'smooth' });
  };

  const renderEmpty = () => (
    <div className="py-16 text-center opacity-60">
      <BarChart3 className="mx-auto mb-4 text-app-text-muted" size={48} />
      <p className="font-medium text-app-text">{t.labels.noInsights || 'No progressions yet'}</p>
      <p className="mt-2 text-sm text-app-text-muted">{t.labels.noInsightsDesc || 'Start logging exercises to see your progress'}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div ref={carouselRef} onScroll={handleScroll} className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth">
          {slides.map((slide) => (
            <div key={slide.id} className="w-full shrink-0 snap-start px-1">
              <Surface className="min-h-[280px]">
                <h2 className="mb-4 text-lg font-semibold text-app-text">{slide.title}</h2>
                {slide.id === 'recent' && (
                  <>
                    {recentProgressions.length === 0 ? (
                      renderEmpty()
                    ) : (
                      <div className="space-y-3">
                        {recentProgressions.map((progression) => (
                          <div key={progression.exerciseId} className="rounded-2xl border border-app-border bg-app-surface p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <h3 className="truncate text-base font-semibold text-app-text">{progression.exerciseName}</h3>
                                <p className="mt-0.5 text-xs uppercase tracking-wide text-app-text-muted">{getTranslatedGroupName(progression.muscleGroup)}</p>
                              </div>
                              <span className="mt-1 flex-shrink-0 text-xs text-app-text-muted">{progression.progressionText}</span>
                            </div>
                            <div className="mt-3 flex flex-col gap-1.5">
                              <div className="flex items-center gap-2">
                                <span className="w-10 text-xs text-app-text-muted">kg</span>
                                {progression.detail.currWeight > progression.detail.prevWeight ? (
                                  <Badge variant="accent" className="rounded-lg px-2.5 py-1 text-sm">
                                    {progression.detail.prevWeight} → {progression.detail.currWeight}
                                  </Badge>
                                ) : (
                                  <div className="rounded-lg border border-app-border bg-app-surface-muted px-2.5 py-1 text-sm text-app-text-muted">
                                    {progression.detail.prevWeight} → {progression.detail.currWeight}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-10 text-xs text-app-text-muted">reps</span>
                                {progression.detail.currReps > progression.detail.prevReps ? (
                                  <Badge variant="success" className="rounded-lg px-2.5 py-1 text-sm">
                                    {progression.detail.prevReps} → {progression.detail.currReps}
                                  </Badge>
                                ) : (
                                  <div className="rounded-lg border border-app-border bg-app-surface-muted px-2.5 py-1 text-sm text-app-text-muted">
                                    {progression.detail.prevReps} → {progression.detail.currReps}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
                {slide.id === 'topWeight' && (
                  <>
                    {topWeightExercises.length === 0 ? (
                      renderEmpty()
                    ) : (
                      <div className="space-y-3">
                        {topWeightExercises.map((exercise) => (
                          <div key={exercise.exerciseId} className="rounded-2xl border border-app-border bg-app-surface p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-app-text">{exercise.exerciseName}</h3>
                                <p className="mt-1 text-xs uppercase tracking-wide text-app-text-muted">{getTranslatedGroupName(exercise.muscleGroup)}</p>
                                <div className="mt-3 flex items-center gap-4">
                                  <div>
                                    <p className="mb-1 text-xs text-app-text-muted">{t.labels.weightShort}</p>
                                    <p className="text-xl font-bold text-app-text">{exercise.weight}<span className="ml-1 text-sm font-normal text-app-text-muted">kg</span></p>
                                  </div>
                                  <div>
                                    <p className="mb-1 text-xs text-app-text-muted">{t.labels.reps}</p>
                                    <p className="text-xl font-bold text-app-text">{exercise.reps}<span className="ml-1 text-sm font-normal text-app-text-muted">rep{exercise.reps !== 1 ? 's' : ''}</span></p>
                                  </div>
                                </div>
                              </div>
                              <Badge variant="success" className="whitespace-nowrap px-3 py-1.5 text-xs">{exercise.timeSince}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </Surface>
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-2">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              onClick={() => handleIndicatorClick(index)}
              className={`h-2 w-2 rounded-full transition-colors ${activeIndex === index ? 'bg-app-accent' : 'bg-app-border'}`}
              aria-label={`${slide.title} (${slide.count})`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
