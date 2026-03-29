import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Exercise } from '../types';
import { getLatestLog } from '../utils/progression';
import { t } from '../utils/translations';
import { ActionSheet } from './ActionSheet';

interface Props {
  exercise: Exercise;
  onLog: (weight: number, reps: number) => void;
  onDelete: () => void;
  onRename: () => void;
  onMove: () => void;
  onUpdateNote: (note: string) => void;
}

const LONG_PRESS_MS = 500;

export const ExerciseCard: React.FC<Props> = ({ exercise, onLog, onDelete, onRename, onMove, onUpdateNote }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const currentStatus = getLatestLog(exercise.logs);

  const [weight, setWeight] = useState<string>('');
  const [reps, setReps] = useState<string>('');
  const [note, setNote] = useState<string>(exercise.note ?? '');

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  useEffect(() => {
    setNote(exercise.note ?? '');
  }, [exercise.note]);

  const startLongPress = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON') return;

    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setShowActions(true);
    }, LONG_PRESS_MS);
  }, []);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handlePress = useCallback((e?: React.TouchEvent | React.MouseEvent) => {
    e?.preventDefault();
    cancelLongPress();
    if (didLongPress.current) return;
    setIsExpanded((prev) => !prev);
  }, [cancelLongPress]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight || !reps) return;
    onLog(parseFloat(weight), parseInt(reps, 10));
    setWeight('');
    setReps('');
    setIsExpanded(false);
  };

  const actions = [
    { label: t.actions.rename, onPress: onRename },
    { label: t.actions.move, onPress: onMove },
    { label: t.actions.delete, destructive: true, onPress: onDelete },
  ];

  return (
    <>
      <div className="relative mb-4 rounded-2xl bg-ios-card overflow-hidden select-none">
        <div
          className="p-4 cursor-pointer"
          onTouchStart={startLongPress}
          onTouchEnd={handlePress}
          onTouchMove={cancelLongPress}
          onMouseDown={startLongPress}
          onMouseUp={handlePress}
          onMouseLeave={cancelLongPress}
        >
          <div className="flex justify-between items-center">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-ios-text">{exercise.name}</h3>
              <div className="flex items-center space-x-2 mt-1">
                {currentStatus ? (
                  <span className="text-2xl font-bold tracking-tight text-ios-text">
                    {currentStatus.weight}<span className="text-sm font-normal text-ios-gray ml-0.5">kg</span>
                    <span className="text-gray-300 dark:text-gray-600 mx-2">/</span>
                    {currentStatus.reps}<span className="text-sm font-normal text-ios-gray ml-0.5">{t.labels.reps.toLowerCase()}</span>
                  </span>
                ) : (
                  <span className="text-ios-gray text-sm">{t.labels.noLogs}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="px-4 pb-4 border-t border-ios-separator animate-fadeIn">
            <div className="mt-4 mb-4">
              <label className="block text-xs font-medium text-ios-gray mb-1 ml-1">{t.labels.note}</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onBlur={() => onUpdateNote(note)}
                placeholder={t.labels.notePlaceholder}
                className="w-full bg-ios-bg text-ios-text text-base p-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-ios-blue"
              />
            </div>
            <form onSubmit={handleSubmit} className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-ios-gray mb-1 ml-1">{t.labels.weight}</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder={currentStatus?.weight.toString() || "0"}
                  className="w-full bg-ios-bg text-ios-text text-lg p-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-ios-blue"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-ios-gray mb-1 ml-1">{t.labels.reps}</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  placeholder={currentStatus?.reps.toString() || "0"}
                  className="w-full bg-ios-bg text-ios-text text-lg p-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-ios-blue"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="bg-ios-blue text-white font-semibold h-[52px] px-6 rounded-xl active:opacity-80 transition-opacity"
                >
                  {t.actions.log}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {showActions && (
        <ActionSheet
          title={exercise.name}
          actions={actions}
          onClose={() => setShowActions(false)}
        />
      )}
    </>
  );
};
