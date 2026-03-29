import React, { useEffect, useRef } from 'react';
import { t } from '../utils/translations';

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
  const mountedAt = useRef(Date.now());

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  const handleBackdropClick = () => {
    // Ignore interaction in the first 350ms to prevent the touchEnd that
    // triggered the long-press from immediately closing the sheet.
    if (Date.now() - mountedAt.current < 350) return;
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
      onClick={handleBackdropClick}
      onTouchEnd={handleBackdropClick}
    >
      <div
        className="w-full max-w-md mb-4 px-4 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="bg-ios-card rounded-2xl overflow-hidden mb-2">
          <div className="px-4 pt-4 pb-3 border-b border-ios-separator">
            <p className="text-sm font-semibold text-ios-text text-center">{title}</p>
            {subtitle && (
              <p className="text-xs text-ios-gray text-center mt-0.5">{subtitle}</p>
            )}
          </div>
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                action.onPress();
                onClose();
              }}
              className={`w-full px-4 py-4 text-base font-medium text-center active:bg-ios-bg transition-colors ${
                action.destructive ? 'text-red-500' : 'text-ios-blue'
              } ${index < actions.length - 1 ? 'border-b border-ios-separator' : ''}`}
            >
              {action.label}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full bg-ios-card rounded-2xl py-4 text-base font-semibold text-ios-blue active:bg-ios-bg transition-colors"
        >
          {t.actions.cancel}
        </button>
      </div>
    </div>
  );
};
