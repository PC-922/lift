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
    <div className="relative">
      <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-app-text-muted" />
      <Input {...props} value={value} compact className={cn('pl-10 pr-10', className)} />
      {value && onClear && (
        <button
          type="button"
          onClick={onClear}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-app-text-muted transition-colors active:bg-app-surface-muted"
        aria-label="Clear search"
      >
          <X size={14} />
        </button>
      )}
    </div>
  );
};
