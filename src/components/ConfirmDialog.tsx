import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  loading?: boolean;
}

/**
 * Dialog konfirmasi WAJIB untuk semua skenario guard relasi (§11).
 * Prinsip: selalu 2 tombol jelas — "Batal" dan "Ya, tetap lanjutkan".
 * Tidak ada aksi hapus/edit langsung tanpa melalui dialog ini.
 */
export function ConfirmDialog({
  open,
  title = '⚠️ Peringatan',
  message,
  onCancel,
  onConfirm,
  confirmLabel = 'Ya, tetap lanjutkan',
  loading = false
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-gray-700 whitespace-pre-line mb-6">{message}</p>
      <div className="flex flex-col-reverse md:flex-row gap-2 md:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          Batal
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={loading}>
          {loading ? 'Memproses...' : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
