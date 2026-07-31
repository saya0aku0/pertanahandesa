import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { PinBoxInput } from './PinBoxInput';

interface PinDialogProps {
  open: boolean;
  title?: string;
  /** true kalau user belum pernah punya PIN — dialog akan minta buat PIN baru, bukan verifikasi */
  needsSetup?: boolean;
  onCancel: () => void;
  onVerify: (pin: string) => Promise<boolean>;
  onSetup: (pin: string) => Promise<void>;
  onSuccess: () => void;
}

/**
 * Dialog PIN — WAJIB dilewati sebelum aksi Edit atau Hapus pada data yang sudah
 * tersimpan. Dua mode:
 * - Verifikasi (default): PIN dicocokkan dengan PIN milik user yang sedang login.
 * - Setup (needsSetup=true): untuk user LAMA yang belum pernah mengisi PIN —
 *   diminta membuat PIN baru dulu (2x isian), tanpa perlu verifikasi PIN lama
 *   (karena memang belum ada).
 * PIN diisi lewat kotak per-digit (auto-pindah, lihat PinBoxInput), dan begitu
 * berhasil, muncul animasi centang sekilas sebelum aksi Edit/Hapus benar-benar jalan.
 */
export function PinDialog({
  open,
  title,
  needsSetup = false,
  onCancel,
  onVerify,
  onSetup,
  onSuccess
}: PinDialogProps) {
  const [pin, setPin] = useState('');
  const [konfirmasiPin, setKonfirmasiPin] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sukses, setSukses] = useState(false);

  function reset() {
    setPin('');
    setKonfirmasiPin('');
    setError(null);
    setSukses(false);
  }

  // Animasi centang singkat sebelum dialog ditutup & aksi Edit/Hapus benar-benar jalan.
  function tampilkanSuksesLaluLanjut() {
    setSukses(true);
    setTimeout(() => {
      reset();
      onSuccess();
    }, 650);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (needsSetup) {
      if (pin.length < 4) {
        setError('PIN minimal 4 digit.');
        return;
      }
      if (pin !== konfirmasiPin) {
        setError('Konfirmasi PIN tidak sama.');
        return;
      }
      setChecking(true);
      try {
        await onSetup(pin);
        tampilkanSuksesLaluLanjut();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal menyimpan PIN.');
      } finally {
        setChecking(false);
      }
      return;
    }

    setChecking(true);
    try {
      const valid = await onVerify(pin);
      if (!valid) {
        setError('PIN salah. Coba lagi.');
        return;
      }
      tampilkanSuksesLaluLanjut();
    } finally {
      setChecking(false);
    }
  }

  function handleClose() {
    reset();
    onCancel();
  }

  return (
    <Modal open={open} onClose={handleClose} title={title ?? (needsSetup ? 'Buat PIN Keamanan' : 'Verifikasi PIN')}>
      {sukses ? (
        <div className="py-6 flex flex-col items-center gap-3 animate-overlay-fade">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl text-green-600 animate-success-reveal">
            ✓
          </div>
          <p className="text-sm font-medium text-gray-700">
            {needsSetup ? 'PIN berhasil dibuat' : 'PIN benar, memproses...'}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {needsSetup ? (
            <p className="text-sm text-gray-600">
              Akun Anda belum punya PIN keamanan (dibuat sebelum fitur ini ada). Buat PIN 4-6 digit
              sekarang — PIN ini akan diminta setiap kali Anda menekan Edit atau Hapus pada data yang
              sudah tersimpan.
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              Aksi ini mengubah data yang sudah tersimpan. Masukkan PIN Anda untuk melanjutkan.
            </p>
          )}
          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {needsSetup ? 'PIN Baru' : 'PIN'}
            </label>
            <PinBoxInput value={pin} onChange={setPin} autoFocus disabled={checking} />
          </div>

          {needsSetup && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Konfirmasi PIN Baru</label>
              <PinBoxInput value={konfirmasiPin} onChange={setKonfirmasiPin} disabled={checking} />
            </div>
          )}

          <div className="flex flex-col-reverse md:flex-row gap-2 md:justify-end">
            <Button type="button" variant="secondary" onClick={handleClose} disabled={checking}>
              Batal
            </Button>
            <Button type="submit" disabled={checking || pin.length < 4}>
              {checking ? 'Memproses...' : needsSetup ? 'Simpan PIN' : 'Konfirmasi'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
