import { ReactNode, useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  // Tombol Escape untuk menutup — penting untuk aksesibilitas keyboard (WCAG 2.1.2)
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-0 md:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full md:max-w-lg md:rounded-xl rounded-t-2xl max-h-[90vh] overflow-y-auto allow-native-touch"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-between gap-3 p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold break-words">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-gray-800"
          >
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
