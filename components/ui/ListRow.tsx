import React from 'react';
import { cn } from '../../utils/cn';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padded?: boolean;
}

export const ListRow: React.FC<Props> = ({ className, children, padded = true, ...props }) => {
  return (
    <div
      className={cn(
        'rounded-2xl border border-app-border bg-app-surface transition-colors active:bg-app-surface-muted',
        padded && 'px-4 py-4 sm:px-5 sm:py-5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
