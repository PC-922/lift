import React, { useState, useRef } from 'react';
import { Trash2, ChevronRight, Pencil } from 'lucide-react';
import { Routine } from '../types';
import { t } from '../utils/translations';

interface Props {
  routine: Routine;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const SWIPE_ACTIVATION_THRESHOLD = 30;

export const RoutineCard: React.FC<Props> = ({ routine, onClick, onEdit, onDelete }) => {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef<number>(0);
  const startY = useRef<number>(0);
  const startTranslate = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    startTranslate.current = translateX;
    setIsDragging(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diff = currentX - startX.current;
    const diffY = currentY - startY.current;

    if (!isDragging) {
      if (Math.abs(diff) < SWIPE_ACTIVATION_THRESHOLD || Math.abs(diff) < Math.abs(diffY)) {
        return;
      }
      setIsDragging(true);
    }

    let newX = startTranslate.current + diff;
    if (newX < -80) newX = -80;
    if (newX > 80) newX = 80;
    setTranslateX(newX);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (translateX < -40) {
      setTranslateX(-80);
    } else if (translateX > 40) {
      setTranslateX(80);
    } else {
      setTranslateX(0);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit();
    setTranslateX(0);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
    setTranslateX(0);
  };

  const handleCardClick = () => {
    if (translateX !== 0) {
      setTranslateX(0);
    } else {
      onClick();
    }
  };

  return (
    <div className="relative rounded-2xl bg-ios-bg overflow-hidden select-none">
      <div className="absolute inset-0 flex justify-between">
        <div className="bg-blue-500 w-[80px] flex items-center justify-center">
          <button
            onClick={handleEditClick}
            className="w-full h-full flex items-center justify-center text-white active:bg-blue-600 transition-colors"
            aria-label={t.actions.edit}
          >
            <Pencil size={24} />
          </button>
        </div>

        <div className="bg-red-500 w-[80px] flex items-center justify-center">
          <button
            onClick={handleDeleteClick}
            className="w-full h-full flex items-center justify-center text-white active:bg-red-600 transition-colors"
            aria-label={t.actions.delete}
          >
            <Trash2 size={24} />
          </button>
        </div>
      </div>

      <div
        className={`bg-ios-card relative z-10 p-4 transition-transform ${isDragging ? '' : 'duration-300 ease-out'} touch-pan-y flex justify-between items-center active:bg-gray-50 dark:active:bg-gray-800`}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleCardClick}
      >
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-ios-text truncate">{routine.name}</h3>
          <p className="text-xs text-ios-gray mt-1">
            {routine.exercises.length} {t.labels.exercises}
          </p>
        </div>
        <ChevronRight size={18} className="text-ios-gray ml-3 flex-shrink-0" />
      </div>
    </div>
  );
};
