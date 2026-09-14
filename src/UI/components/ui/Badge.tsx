import React from 'react';
import { cn } from '../../utils/cn';

type BadgeVariant = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

interface Props extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral: 'border border-transparent bg-app-chip-bg text-app-chip-text',
  accent: 'border border-transparent bg-app-accent text-app-accent-foreground',
  success: 'border border-transparent bg-app-success text-white',
  warning: 'border border-transparent bg-app-warning text-white',
  danger: 'border border-transparent bg-app-danger text-white',
};

export const Badge: React.FC<Props> = ({ variant = 'neutral', className, ...props }) => {
  return <span className={cn('inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold', variantClasses[variant], className)} {...props} />;
};
