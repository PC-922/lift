import { useTranslations } from '../utils/translations';
import { Modal } from './Modal';
import { Button } from './ui/Button';
import { Surface } from './ui/Surface';

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
      <Surface className="w-full max-w-md space-y-4 rounded-t-3xl p-6" onClick={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-app-text text-center">{title}</h2>
        {message && (
          <p className="text-sm text-app-text-muted text-center">{message}</p>
        )}
        <div className="flex flex-col gap-2 pt-2">
          <Button
            onClick={onConfirm}
            data-testid="confirm-modal-confirm"
            variant={destructive ? 'destructive' : 'primary'}
            className="w-full"
          >
            {confirmLabel ?? t.actions.delete}
          </Button>
          <Button onClick={onCancel} variant="secondary" className="w-full">
            {t.actions.cancel}
          </Button>
        </div>
      </Surface>
    </Modal>
  );
}
