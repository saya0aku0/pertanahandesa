import { Button } from './Button';

interface FormActionBarProps {
  onSimpan: () => void;
  onPending?: () => void;
  onBatal: () => void;
  onHapus?: () => void;
  saving?: boolean;
  /** Tampilkan tombol Pending — hanya relevan kalau ada proses ukur/terbit sertifikat yang masih berjalan */
  showPending?: boolean;
  /** Tombol Hapus hanya tampil untuk data yang sudah tersimpan (mode edit) */
  showHapus?: boolean;
  simpanLabel?: string;
}

/**
 * Bar tombol aksi WAJIB di semua form: Pending, Simpan, Batal, Hapus.
 * - Pending: simpan sebagai draft (status "Drafted") — dipakai kalau proses ukur/terbit
 *   sertifikat baru masih berjalan di pemerintah, supaya data tidak hilang sambil menunggu.
 * - Simpan: finalisasi data (status aktif/final).
 * - Batal: keluar tanpa menyimpan perubahan.
 * - Hapus: hanya untuk data yang sudah tersimpan; wajib verifikasi PIN sebelum dieksekusi
 *   (lihat usePinGuard / PinDialog).
 */
export function FormActionBar({
  onSimpan,
  onPending,
  onBatal,
  onHapus,
  saving = false,
  showPending = true,
  showHapus = false,
  simpanLabel = 'Simpan'
}: FormActionBarProps) {
  return (
    <div className="flex flex-col-reverse md:flex-row gap-2 md:justify-end pt-2">
      {showHapus && onHapus && (
        <Button type="button" variant="danger" onClick={onHapus} disabled={saving}>
          Hapus
        </Button>
      )}
      <Button type="button" variant="secondary" onClick={onBatal} disabled={saving}>
        Batal
      </Button>
      {showPending && onPending && (
        <Button type="button" variant="ghost" onClick={onPending} disabled={saving}>
          {saving ? 'Menyimpan...' : 'Pending (Drafted)'}
        </Button>
      )}
      <Button type="button" onClick={onSimpan} disabled={saving}>
        {saving ? 'Menyimpan...' : simpanLabel}
      </Button>
    </div>
  );
}
