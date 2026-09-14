import React, { useCallback, useRef, useState } from 'react';

export interface DragReorderState {
  draggingId: string | null;
  dropIndicatorIndex: number | null;
}

export interface DragReorderBindings {
  handleStart: (id: string) => (event: React.PointerEvent) => void;
  bindItem: (id: string) => { ref: (node: HTMLElement | null) => void };
  getItemStyle: (id: string) => React.CSSProperties;
}

export function useDragReorder<T>(items: readonly T[], onReorder: (fromIndex: number, toIndex: number) => void, getId: (item: T) => string): DragReorderState & DragReorderBindings {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null);
  const itemRefs = useRef<Map<string, HTMLElement | null>>(new Map());
  const activeRef = useRef<{ id: string; fromIndex: number; startY: number } | null>(null);

  const getRects = useCallback((): DOMRect[] => {
    return items.map((item) => itemRefs.current.get(getId(item))?.getBoundingClientRect() ?? new DOMRect());
  }, [items, getId]);

  const computeTargetIndex = useCallback((clientY: number): number => {
    const rects = getRects();
    if (rects.length === 0) return 0;
    for (let i = 0; i < rects.length; i++) {
      const midpoint = rects[i].top + rects[i].height / 2;
      if (clientY < midpoint) return i;
    }
    return rects.length;
  }, [getRects]);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (!activeRef.current) return;
    event.preventDefault();
    setDropIndicatorIndex(computeTargetIndex(event.clientY));
  }, [computeTargetIndex]);

  const handlePointerUp = useCallback((event: PointerEvent) => {
    const active = activeRef.current;
    if (!active) return;
    event.preventDefault();

    const moved = Math.abs(event.clientY - active.startY);
    if (moved > 8) {
      const targetIndex = computeTargetIndex(event.clientY);
      if (targetIndex !== active.fromIndex && targetIndex !== active.fromIndex + 1) {
        const adjustedIndex = targetIndex > active.fromIndex ? targetIndex - 1 : targetIndex;
        onReorder(active.fromIndex, adjustedIndex);
      }
    }

    activeRef.current = null;
    setDraggingId(null);
    setDropIndicatorIndex(null);
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  }, [computeTargetIndex, handlePointerMove, onReorder]);

  const handleStart = useCallback((id: string) => (event: React.PointerEvent) => {
    const element = itemRefs.current.get(id);
    if (!element) return;
    event.preventDefault();
    (event.currentTarget as Element | undefined)?.setPointerCapture?.(event.pointerId);

    const fromIndex = items.findIndex((item) => getId(item) === id);
    if (fromIndex === -1) return;

    activeRef.current = { id, fromIndex, startY: event.clientY };
    setDraggingId(id);
    setDropIndicatorIndex(fromIndex);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, [items, getId, handlePointerMove, handlePointerUp]);

  const bindItem = useCallback((id: string) => ({
    ref: (node: HTMLElement | null) => { itemRefs.current.set(id, node); },
  }), []);

  const getItemStyle = useCallback((id: string): React.CSSProperties => {
    if (draggingId !== id) return {};
    return {
      opacity: 0.5,
      transform: 'scale(1.02)',
      zIndex: 10,
      position: 'relative',
    };
  }, [draggingId]);

  return {
    draggingId,
    dropIndicatorIndex,
    handleStart,
    bindItem,
    getItemStyle,
  };
}
