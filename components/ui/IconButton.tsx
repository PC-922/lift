import React from 'react';
import { cn } from '../../utils/cn';

type IconButtonVariant = 'primary' | 'secondary' | 'ghost';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
}

const variantClasses: Record<IconButtonVariant, string> = {
  primary: 'border border-transparent bg-app-accent text-app-accent-foreground',
  secondary: 'border border-app-border bg-app-surface text-app-text',
  ghost: 'border border-transparent bg-transparent text-app-text-muted',
};

export const IconButton: React.FC<Props> = ({ variant = 'ghost', className, type = 'button', ...props }) => {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center rounded-xl transition-colors active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
};
