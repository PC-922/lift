import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

interface Props extends React.SelectHTMLAttributes<HTMLSelectElement> {
  compact?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, Props>(function Select(
  { className, compact = false, children, ...props },
  ref
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'w-full appearance-none rounded-xl border border-app-border bg-app-surface pr-10 text-app-text outline-none transition focus:border-app-accent focus:ring-2 focus:ring-app-accent disabled:cursor-not-allowed disabled:opacity-50',
          compact ? 'h-10 px-3 py-2 text-sm' : 'h-12 px-4 py-3 text-base',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-app-text-muted"
        aria-hidden="true"
      />
    </div>
  );
});