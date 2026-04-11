import React from 'react';
import { cn } from '../../utils/cn';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  compact?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, Props>(function Input(
  { className, compact = false, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-xl border border-app-border bg-app-surface px-4 text-app-text outline-none transition placeholder:text-app-text-muted focus:border-app-accent focus:ring-2 focus:ring-app-accent disabled:cursor-not-allowed disabled:opacity-50',
        compact ? 'h-10 py-2 text-sm' : 'h-12 py-3 text-base',
        className
      )}
      {...props}
    />
  );
});
