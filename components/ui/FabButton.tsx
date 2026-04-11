import React from 'react';
import { cn } from '../../utils/cn';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
}

export const FabButton: React.FC<Props> = ({ icon, className, type = 'button', ...props }) => {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex h-14 w-14 items-center justify-center rounded-full border border-app-border bg-app-accent text-app-accent-foreground transition-colors active:scale-[0.98]',
        className
      )}
      {...props}
    >
      {icon}
    </button>
  );
};
