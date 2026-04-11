import React from 'react';
import { useTranslations } from '../utils/translations';
import { Modal } from './Modal';
import { Surface } from './ui/Surface';
import { Button } from './ui/Button';

export interface ActionSheetAction {
  label: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  onPress: () => void;
}

interface Props {
  title: string;
  subtitle?: string;
  actions: ActionSheetAction[];
  onClose: () => void;
}

export const ActionSheet: React.FC<Props> = ({ title, subtitle, actions, onClose }) => {
  const t = useTranslations();
  return (
    <Modal open onClose={onClose} position="bottom">
      <div
        className="w-full max-w-md mb-4 px-4 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <Surface className="mb-2 overflow-hidden p-0">
          <div className="px-4 py-3 border-b border-app-border text-center">
            <p className="text-sm font-semibold text-app-text">{title}</p>
            {subtitle && <p className="mt-0.5 text-xs text-app-text-muted">{subtitle}</p>}
          </div>
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                action.onPress();
                onClose();
              }}
              className={`w-full border-b border-app-border px-4 py-4 text-center text-base font-medium transition-colors active:bg-app-surface-muted ${
                action.destructive ? 'text-app-danger' : 'text-app-text'
              } ${index === actions.length - 1 ? 'border-b-0' : ''}`}
            >
              {action.label}
            </button>
          ))}
        </Surface>

        <Button variant="secondary" className="w-full" onClick={onClose}>
          {t.actions.cancel}
        </Button>
      </div>
    </Modal>
  );
};
