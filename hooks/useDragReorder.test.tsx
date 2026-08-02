import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { useDragReorder } from './useDragReorder';

interface Item {
  id: string;
  name: string;
}

function TestList({ items, onReorder }: { items: Item[]; onReorder: (from: number, to: number) => void }) {
  const drag = useDragReorder(items, onReorder, (item) => item.id);

  return (
    <div>
      {items.map((item, index) => (
        <React.Fragment key={item.id}>
          {drag.dropIndicatorIndex === index && <div data-testid={`indicator-${index}`} className="indicator" />}
          <div
            ref={drag.bindItem(item.id).ref}
            style={drag.getItemStyle(item.id)}
            data-testid={`item-${item.id}`}
          >
            <button
              data-testid={`handle-${item.id}`}
              onPointerDown={drag.handleStart(item.id)}
            >
              {item.name}
            </button>
          </div>
        </React.Fragment>
      ))}
      {drag.dropIndicatorIndex === items.length && <div data-testid={`indicator-${items.length}`} className="indicator" />}
    </div>
  );
}

describe('useDragReorder', () => {
  const items: Item[] = [
    { id: 'a', name: 'A' },
    { id: 'b', name: 'B' },
    { id: 'c', name: 'C' },
  ];

  const rects = [
    { top: 0, height: 50, bottom: 50, left: 0, right: 100, width: 100, x: 0, y: 0 },
    { top: 50, height: 50, bottom: 100, left: 0, right: 100, width: 100, x: 0, y: 50 },
    { top: 100, height: 50, bottom: 150, left: 0, right: 100, width: 100, x: 0, y: 100 },
  ];

  beforeEach(() => {
    vi.stubGlobal('navigator', { onLine: true, language: 'en' } as Navigator);
    if (typeof window.PointerEvent === 'undefined') {
      class PointerEventPolyfill extends MouseEvent {
        public pointerId: number;
        constructor(type: string, init: PointerEventInit = {}) {
          super(type, init);
          this.pointerId = init.pointerId ?? 0;
        }
      }
      vi.stubGlobal('PointerEvent', PointerEventPolyfill);
    }
  });

  function dispatchPointer(element: Element | Window, type: string, clientY: number, pointerId = 1) {
    const event = new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId,
      clientY,
    });
    element.dispatchEvent(event);
  }

  it('does not call onReorder when an item is tapped without moving', () => {
    const onReorder = vi.fn();
    render(<TestList items={items} onReorder={onReorder} />);

    const handle = screen.getByTestId('handle-a');
    handle.setPointerCapture = vi.fn();
    act(() => dispatchPointer(handle, 'pointerdown', 25));
    act(() => dispatchPointer(window, 'pointerup', 25));

    expect(onReorder).not.toHaveBeenCalled();
  });

  it('reorders from index 0 to index 2 when dragged below the second item', () => {
    const onReorder = vi.fn();
    render(<TestList items={items} onReorder={onReorder} />);

    const handle = screen.getByTestId('handle-a');
    handle.setPointerCapture = vi.fn();
    const item = screen.getByTestId('item-a');
    item.getBoundingClientRect = vi.fn(() => rects[0] as DOMRect);

    items.forEach((it, index) => {
      const node = screen.getByTestId(`item-${it.id}`);
      node.getBoundingClientRect = vi.fn(() => rects[index] as DOMRect);
    });

    act(() => dispatchPointer(handle, 'pointerdown', 25));
    act(() => dispatchPointer(window, 'pointermove', 125));
    act(() => dispatchPointer(window, 'pointerup', 125));

    expect(onReorder).toHaveBeenCalledWith(0, 2);
  });
});
