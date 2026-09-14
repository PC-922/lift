import { useState } from 'react';
import { useTranslations } from '../utils/translations';
import { Modal } from './Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface Props {
  title: string;
  placeholder?: string;
  initialValue?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export default function PromptModal({
  title,
  placeholder,
  initialValue = '',
  onConfirm,
  onCancel,
}: Props) {
  const t = useTranslations();
  const [value, setValue] = useState(initialValue);

  const handleConfirm = () => {
    const trimmed = value.trim();
    if (trimmed) onConfirm(trimmed);
  };

  return (
    <Modal open onClose={onCancel} position="bottom">
      <div className="flex max-h-[calc(100dvh-1.5rem)] w-full flex-col" aria-labelledby="prompt-modal-title">
        <div className="shrink-0 border-b border-app-border px-6 pb-4 pt-5">
          <h2 id="prompt-modal-title" className="text-lg font-semibold text-app-text">{title}</h2>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-app-text-muted" htmlFor="prompt-input">
              {title}
            </label>
            <Input
              id="prompt-input"
              autoFocus
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirm();
              }}
              placeholder={placeholder}
            />
          </div>
        </div>

        <div className="shrink-0 border-t border-app-border px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
          <div className="flex gap-3">
            <Button onClick={onCancel} variant="secondary" className="flex-1">
              {t.actions.cancel}
            </Button>
            <Button onClick={handleConfirm} disabled={!value.trim()} className="flex-1">
              {t.actions.save}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
