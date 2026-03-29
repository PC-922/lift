import React, { useMemo, useRef, useState } from 'react';
import { Exercise } from '../types';
import { getRecentProgressions } from '../utils/progression';
import { getTopWeightExercises } from '../utils/insights';
import { t } from '../utils/translations';
import { BarChart3 } from 'lucide-react';

interface Props {
  exercises: Exercise[];
}

export const InsightsScreen: React.FC<Props> = ({ exercises }) => {
  const recentProgressions = getRecentProgressions(exercises, 3);
  const topWeightExercises = getTopWeightExercises(exercises, 3);
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const slides = useMemo(
    () => [
      { id: 'recent', title: t.labels.recentProgress, count: recentProgressions.length },
      { id: 'topWeight', title: t.labels.topWeightExercises, count: topWeightExercises.length },
    ],
    [recentProgressions.length, topWeightExercises.length]
  );

  const handleScroll = () => {
    const container = carouselRef.current;
    if (!container) return;
    const index = Math.round(container.scrollLeft / container.clientWidth);
    setActiveIndex(index);
  };

  const handleIndicatorClick = (index: number) => {
    const container = carouselRef.current;
    if (!container) return;
    container.scrollTo({ left: index * container.clientWidth, behavior: 'smooth' });
  };

  const renderEmpty = () => (
    <div className="text-center py-16 opacity-50">
      <BarChart3 className="mx-auto text-ios-gray mb-4" size={48} />
      <p className="text-ios-text font-medium">{t.labels.noInsights || 'No progressions yet'}</p>
      <p className="text-sm text-ios-gray mt-2">
        {t.labels.noInsightsDesc || 'Start logging exercises to see your progress'}
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-3">
          <BarChart3 className="text-ios-blue" size={28} />
          <h1 className="text-2xl font-bold text-ios-text">{t.labels.insights || 'Insights'}</h1>
        </div>
        <p className="text-sm text-ios-gray">{t.labels.insightsDesc || 'Progress summary'}</p>
      </div>

      <div className="space-y-4">
        <div
          ref={carouselRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth"
        >
          {slides.map((slide) => (
            <div key={slide.id} className="w-full shrink-0 snap-start px-1">
              <div className="bg-ios-bg rounded-2xl p-4 min-h-[280px]">
                <h2 className="text-lg font-semibold text-ios-text mb-4">{slide.title}</h2>
                {slide.id === 'recent' && (
                  <>
                    {recentProgressions.length === 0 ? (
                      renderEmpty()
                    ) : (
                      <div className="space-y-3">
                        {recentProgressions.map((progression) => (
                          <div
                            key={progression.exerciseId}
                            className="bg-ios-card rounded-2xl p-4 border-l-4 border-ios-blue"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-base font-semibold text-ios-text truncate">{progression.exerciseName}</h3>
                                <p className="text-xs text-ios-gray mt-0.5 uppercase tracking-wide">
                                  {(t.muscleGroups as Record<string, string>)[progression.muscleGroup] || progression.muscleGroup}
                                </p>
                              </div>
                              <span className="text-xs text-ios-gray flex-shrink-0 mt-1">{progression.progressionText}</span>
                            </div>
                            <div className="mt-3 flex flex-col gap-1.5">
                              {(progression.detail.type === 'weight' || progression.detail.type === 'both') && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-ios-gray w-8">kg</span>
                                  <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2.5 py-1 rounded-lg text-sm font-semibold">
                                    {progression.detail.prevWeight} → {progression.detail.currWeight}
                                  </div>
                                  <span className="text-blue-500 text-sm font-bold">↑</span>
                                </div>
                              )}
                              {(progression.detail.type === 'reps' || progression.detail.type === 'both') && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-ios-gray w-8">reps</span>
                                  <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-lg text-sm font-semibold">
                                    {progression.detail.prevReps} → {progression.detail.currReps}
                                  </div>
                                  <span className="text-green-500 text-sm font-bold">↑</span>
                                </div>
                              )}
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
                          <div
                            key={exercise.exerciseId}
                            className="bg-ios-card rounded-2xl p-4 border-l-4 border-ios-blue"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-ios-text">{exercise.exerciseName}</h3>
                                <p className="text-xs text-ios-gray mt-1 uppercase tracking-wide">
                                  {(t.muscleGroups as any)[exercise.muscleGroup] || exercise.muscleGroup}
                                </p>
                                <div className="mt-3 flex items-center gap-4">
                                  <div>
                                    <p className="text-xs text-ios-gray mb-1">{t.labels.weightShort}</p>
                                    <p className="text-xl font-bold text-ios-text">
                                      {exercise.weight}
                                      <span className="text-sm font-normal text-ios-gray ml-1">kg</span>
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-ios-gray mb-1">{t.labels.reps}</p>
                                    <p className="text-xl font-bold text-ios-text">
                                      {exercise.reps}
                                      <span className="text-sm font-normal text-ios-gray ml-1">
                                        rep{exercise.reps !== 1 ? 's' : ''}
                                      </span>
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap">
                                  {exercise.timeSince}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-2">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              onClick={() => handleIndicatorClick(index)}
              className={`h-2 w-2 rounded-full transition-colors ${
                activeIndex === index ? 'bg-ios-blue' : 'bg-ios-separator'
              }`}
              aria-label={`${slide.title} (${slide.count})`}
            />
          ))}
        </div>
      </div>

    </div>
  );
};
