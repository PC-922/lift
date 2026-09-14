import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Input } from './Input';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onClear?: () => void;
}

export const SearchInput: React.FC<Props> = ({ value, onClear, className, ...props }) => {
  return (
    <div className="relative group">
      <Search size={18} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-app-text-muted transition-colors group-focus-within:text-app-accent" />
      <Input {...props} value={value} compact className={cn('pl-12 pr-12 h-14 rounded-2xl bg-app-surface-muted/50 border-transparent focus:border-app-accent/50 focus:bg-app-surface transition-all', className)} />
      {value && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-2 text-app-text-muted transition-colors active:bg-app-surface-muted"
          aria-label="Clear search"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};
