import React from 'react';
import { cn } from '../../utils/cn';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

export const Surface: React.FC<Props> = ({ className, padded = true, ...props }) => {
  return (
    <div
      className={cn(
        'rounded-2xl border border-app-border bg-app-surface',
        padded && 'p-4 sm:p-5',
        className
      )}
      {...props}
    />
  );
};
