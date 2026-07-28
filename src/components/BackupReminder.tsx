import { useEffect, useState } from 'react';
import { getPaginated } from '@/firebase/firestore';
import { getRiwayatByTanah } from '@/modules/transaksi/riwayat.service';
import { exportLaporanExcel } from '@/modules/master-tanah/exportExcel';
import { Tanah } from '@/modules/master-tanah/tanah.types';

const STORAGE_KEY = 'backupReminderState';

interface BackupReminderState {
  tahunBackupTerakhir?: number;
  tundaSampai?: string; // ISO date
}

function bacaState(): BackupReminderState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function tulisState(state: BackupReminderState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Kalau localStorage penuh/diblokir, abaikan saja — reminder cuma "nice to have"
  }
}

/**
 * Banner pengingat "Backup Data Tahunan" — penting untuk pemakaian jangka panjang
 * oleh SATU petugas SATU perangkat (bertahun-tahun sampai pensiun). Kalau device
 * rusak/hilang atau project Firebase bermasalah, salinan Excel offline ini jadi
 * jaring pengaman terakhir. Sepenuhnya client-side, gratis di Spark Plan.
 */
export function BackupReminder() {
  const [tampil, setTampil] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selesai, setSelesai] = useState(false);

  useEffect(() => {
    const state = bacaState();
    const tahunIni = new Date().getFullYear();
    const sudahBackupTahunIni = state.tahunBackupTerakhir === tahunIni;
    const masihDitunda = state.tundaSampai && new Date(state.tundaSampai) > new Date();
    setTampil(!sudahBackupTahunIni && !masihDitunda);
  }, []);

  async function handleBackupSekarang() {
    setProcessing(true);
    setError(null);
    try {
      // Ambil SEMUA bidang tanah (pageSize besar — dijalankan sesekali per tahun,
      // jadi konsumsi read Firestore-nya tidak masalah sama sekali di Spark Plan).
      const { docs: semuaTanah } = await getPaginated<Tanah>('tanah', [], 5000);
      const rows = await Promise.all(
        semuaTanah.map(async (tanah) => ({
          tanah,
          riwayat: await getRiwayatByTanah(tanah.id)
        }))
      );
      await exportLaporanExcel(rows, { dari: 'semua', sampai: 'semua' });

      tulisState({ tahunBackupTerakhir: new Date().getFullYear() });
      setSelesai(true);
      setTimeout(() => setTampil(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat file backup.');
    } finally {
      setProcessing(false);
    }
  }

  function handleTunda() {
    const tigaMingguLagi = new Date();
    tigaMingguLagi.setDate(tigaMingguLagi.getDate() + 21);
    tulisState({ ...bacaState(), tundaSampai: tigaMingguLagi.toISOString() });
    setTampil(false);
  }

  if (!tampil) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex flex-col md:flex-row md:items-center gap-3 justify-between">
      <div>
        <p className="text-sm font-semibold text-amber-900">
          {selesai ? '✅ Backup tahun ini berhasil dibuat.' : '📦 Sudah backup data tahun ini?'}
        </p>
        {!selesai && (
          <p className="text-xs text-amber-700 mt-0.5">
            Simpan salinan Excel semua data (Master Tanah &amp; Riwayat) di luar aplikasi —
            jaga-jaga kalau perangkat rusak/hilang. Cukup sekali setahun.
          </p>
        )}
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>
      {!selesai && (
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={handleTunda}
            disabled={processing}
            className="text-sm text-amber-700 hover:underline px-2 min-h-[44px]"
          >
            Nanti saja
          </button>
          <button
            type="button"
            onClick={handleBackupSekarang}
            disabled={processing}
            className="bg-amber-600 text-white text-sm font-medium rounded-lg px-4 min-h-[44px] hover:bg-amber-700 disabled:opacity-60"
          >
            {processing ? 'Membuat backup...' : 'Backup Sekarang'}
          </button>
        </div>
      )}
    </div>
  );
}
