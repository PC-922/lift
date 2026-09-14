import React from 'react';
import { ChevronLeft } from 'lucide-react';

interface Props {
  label: string;
  onClick: () => void;
}

export const BackButton: React.FC<Props> = ({ label, onClick }) => (
  <button
    onClick={onClick}
    className="-ml-2 flex items-center gap-0.5 text-sm font-semibold text-app-text active:opacity-60"
  >
    <ChevronLeft size={20} />
    {label}
  </button>
);

