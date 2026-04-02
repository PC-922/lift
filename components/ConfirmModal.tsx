import { t } from '../utils/translations';
import { Modal } from './Modal';

interface Props {
  title: string;
  message?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal open onClose={onCancel} position="bottom">
      <div className="w-full max-w-md rounded-t-2xl bg-ios-card p-6 space-y-4" onClick={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-ios-text text-center">{title}</h2>
        {message && (
          <p className="text-sm text-ios-secondary text-center">{message}</p>
        )}
        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={onConfirm}
            data-testid="confirm-modal-confirm"
            className={`w-full py-3 rounded-xl font-semibold text-white ${
              destructive ? 'bg-ios-red' : 'bg-ios-blue'
            }`}
          >
            {confirmLabel ?? t.actions.delete}
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
