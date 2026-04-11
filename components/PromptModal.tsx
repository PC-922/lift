import { useState } from 'react';
import { useTranslations } from '../utils/translations';
import { Modal } from './Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Surface } from './ui/Surface';

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
      <Surface className="w-full max-w-md space-y-4 rounded-t-3xl p-6" onClick={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-app-text text-center">{title}</h2>
        <Input
          autoFocus
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleConfirm();
            if (e.key === 'Escape') onCancel();
          }}
          placeholder={placeholder}
        />
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleConfirm}
            disabled={!value.trim()}
            className="w-full"
          >
            {t.actions.save}
          </Button>
          <Button onClick={onCancel} variant="secondary" className="w-full">
            {t.actions.cancel}
          </Button>
        </div>
      </Surface>
    </Modal>
  );
}
