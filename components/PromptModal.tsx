import { useState } from 'react';
import { t } from '../utils/translations';
import { Modal } from './Modal';

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
  const [value, setValue] = useState(initialValue);

  const handleConfirm = () => {
    const trimmed = value.trim();
    if (trimmed) onConfirm(trimmed);
  };

  return (
    <Modal open onClose={onCancel} position="bottom">
      <div className="w-full max-w-md rounded-t-2xl bg-ios-card p-6 space-y-4" onClick={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-ios-text text-center">{title}</h2>
        <input
          autoFocus
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleConfirm();
            if (e.key === 'Escape') onCancel();
          }}
          placeholder={placeholder}
          className="w-full bg-ios-bg text-ios-text p-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-ios-blue"
        />
        <div className="flex flex-col gap-2">
          <button
            onClick={handleConfirm}
            disabled={!value.trim()}
            className="w-full py-3 rounded-xl font-semibold text-white bg-ios-blue disabled:opacity-40"
          >
            {t.actions.save}
          </button>
          <button
            onClick={onCancel}
            className="w-full py-3 rounded-xl font-semibold text-ios-blue bg-ios-bg"
          >
            {t.actions.cancel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
