import { Tanah } from './tanah.types';
import { Riwayat } from '@/modules/transaksi/riwayat.types';

/**
 * Backup dalam format JSON — beda dari Excel (yang diratakan/diringkas supaya enak
 * dibaca manusia), JSON ini menyimpan struktur data APA ADANYA (lossless), termasuk
 * semua field, array, dan nested object persis seperti di Firestore. Cocok kalau
 * suatu saat perlu restore/pindah data, bukan cuma dibaca-baca.
 * 100% dibuat di sisi klien (Blob + download), tidak butuh server, gratis di Spark Plan.
 */
export function unduhBackupJson(semuaTanah: (Tanah & { id: string })[], semuaRiwayat: (Riwayat & { id: string })[]) {
  const isi = {
    dibuatPada: new Date().toISOString(),
    aplikasi: 'Riwayat Tanah Desa',
    versiFormat: 1,
    jumlahTanah: semuaTanah.length,
    jumlahRiwayat: semuaRiwayat.length,
    tanah: semuaTanah,
    riwayat: semuaRiwayat
  };

  const blob = new Blob([JSON.stringify(isi, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup-tanah-desa-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
