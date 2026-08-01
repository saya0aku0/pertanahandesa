import { useEffect, useState } from 'react';
import { getPaginated } from '@/firebase/firestore';
import { exportLaporanExcel } from '@/modules/master-tanah/exportExcel';
import { unduhBackupJson } from '@/modules/master-tanah/exportJson';
import { Tanah } from '@/modules/master-tanah/tanah.types';
import { Riwayat } from '@/modules/transaksi/riwayat.types';

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
 * rusak/hilang atau project Firebase bermasalah, salinan offline ini jadi jaring
 * pengaman terakhir. Dua pilihan format: Excel (mudah dibaca) dan JSON (lossless,
 * cocok untuk restore/pindah data persis seperti aslinya). Sepenuhnya client-side,
 * gratis di Spark Plan.
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

  async function ambilSemuaData() {
    // Ambil SEMUA bidang tanah & SEMUA riwayat (pageSize besar — dijalankan sesekali
    // per tahun, jadi konsumsi read Firestore-nya tidak masalah sama sekali di Spark Plan).
    const [{ docs: semuaTanah }, { docs: semuaRiwayat }] = await Promise.all([
      getPaginated<Tanah>('tanah', [], 5000),
      getPaginated<Riwayat>('riwayat', [], 5000)
    ]);
    return { semuaTanah, semuaRiwayat };
  }

  function tandaiSelesai() {
    tulisState({ tahunBackupTerakhir: new Date().getFullYear() });
    setSelesai(true);
    setTimeout(() => setTampil(false), 2500);
  }

  async function handleBackupExcel() {
    setProcessing(true);
    setError(null);
    try {
      const { semuaTanah, semuaRiwayat } = await ambilSemuaData();
      // Format Excel butuh riwayat dikelompokkan per bidang tanah (bukan daftar datar)
      const riwayatPerTanah = new Map<string, (Riwayat & { id: string })[]>();
      for (const r of semuaRiwayat) {
        const list = riwayatPerTanah.get(r.tanahId) ?? [];
        list.push(r);
        riwayatPerTanah.set(r.tanahId, list);
      }
      const rows = semuaTanah.map((tanah) => ({
        tanah,
        riwayat: riwayatPerTanah.get(tanah.id) ?? []
      }));
      await exportLaporanExcel(rows, { dari: 'semua', sampai: 'semua' });
      tandaiSelesai();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat file backup.');
    } finally {
      setProcessing(false);
    }
  }

  async function handleBackupJson() {
    setProcessing(true);
    setError(null);
    try {
      const { semuaTanah, semuaRiwayat } = await ambilSemuaData();
      unduhBackupJson(semuaTanah, semuaRiwayat);
      tandaiSelesai();
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
            Simpan salinan semua data (Master Tanah &amp; Riwayat) di luar aplikasi — jaga-jaga
            kalau perangkat rusak/hilang. Cukup sekali setahun. Excel untuk dibaca-baca, JSON
            kalau nanti perlu dipulihkan/dipindah persis seperti aslinya.
          </p>
        )}
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>
      {!selesai && (
        <div className="flex gap-2 shrink-0 flex-wrap">
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
            onClick={handleBackupJson}
            disabled={processing}
            className="border border-amber-600 text-amber-700 text-sm font-medium rounded-lg px-4 min-h-[44px] hover:bg-amber-100 disabled:opacity-60"
          >
            {processing ? 'Memproses...' : 'Backup JSON'}
          </button>
          <button
            type="button"
            onClick={handleBackupExcel}
            disabled={processing}
            className="bg-amber-600 text-white text-sm font-medium rounded-lg px-4 min-h-[44px] hover:bg-amber-700 disabled:opacity-60"
          >
            {processing ? 'Memproses...' : 'Backup Excel'}
          </button>
        </div>
      )}
    </div>
  );
}
