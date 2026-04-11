import React from 'react';
import { cn } from '../../utils/cn';

type BadgeVariant = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

interface Props extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral: 'border border-app-border bg-app-surface-muted text-app-text-muted',
  accent: 'border border-transparent bg-app-accent text-app-accent-foreground',
  success: 'border border-app-success/30 bg-app-surface-muted text-app-success',
  warning: 'border border-app-warning/30 bg-app-surface-muted text-app-warning',
  danger: 'border border-app-danger/30 bg-app-surface-muted text-app-danger',
};

export const Badge: React.FC<Props> = ({ variant = 'neutral', className, ...props }) => {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', variantClasses[variant], className)} {...props} />;
};
