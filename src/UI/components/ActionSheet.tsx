import React from 'react';
import { useTranslations } from '../utils/translations';
import { Modal } from './Modal';
import { Button } from './ui/Button';

export interface ActionSheetAction {
  label: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  keepOpen?: boolean;
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
      <div className="flex max-h-[calc(100dvh-1.5rem)] w-full flex-col" aria-labelledby="action-sheet-title">
        <div className="shrink-0 border-b border-app-border px-6 pb-4 pt-5">
          <p id="action-sheet-title" className="text-sm font-semibold text-app-text">{title}</p>
          {subtitle && <p className="mt-1 text-xs text-app-text-muted">{subtitle}</p>}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-2">
            {actions.map((action, index) => (
              <button
                key={`${action.label}-${index}`}
                onClick={() => {
                  action.onPress();
                  if (!action.keepOpen) onClose();
                }}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left text-base font-medium transition-colors active:bg-app-surface-muted ${
                  action.destructive ? 'border-app-danger bg-app-danger text-white' : 'border-app-border text-app-text'
                }`}
              >
                <span>{action.label}</span>
                {action.icon && <span className="shrink-0 opacity-70">{action.icon}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="shrink-0 border-t border-app-border px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
          <Button variant="secondary" className="w-full" onClick={onClose}>
            {t.actions.cancel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
