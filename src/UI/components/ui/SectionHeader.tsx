import React from 'react';
import { cn } from '../../utils/cn';

interface Props {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<Props> = ({ title, description, action, className }) => {
  return (
    <div className={cn('flex items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-app-text-muted">{title}</h2>
        {description && <p className="mt-1 text-sm leading-relaxed text-app-text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
};
