import { useTranslations } from '../utils/translations';
import { Modal } from './Modal';
import { Button } from './ui/Button';

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
  const t = useTranslations();
  return (
    <Modal open onClose={onCancel} position="bottom">
      <div className="flex max-h-[calc(100dvh-1.5rem)] w-full flex-col" aria-labelledby="confirm-modal-title">
        <div className="shrink-0 border-b border-app-border px-6 pb-4 pt-5">
          <h2 id="confirm-modal-title" className="text-lg font-semibold text-app-text">{title}</h2>
          {message && <p className="mt-2 text-sm text-app-text-muted">{message}</p>}
        </div>

        <div className="shrink-0 px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
          <div className="flex gap-3">
            <Button onClick={onCancel} variant="secondary" className="flex-1">
              {t.actions.cancel}
            </Button>
            <Button
              onClick={onConfirm}
              data-testid="confirm-modal-confirm"
              variant={destructive ? 'destructive' : 'primary'}
              className="flex-1"
            >
              {confirmLabel ?? t.actions.delete}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
