import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { getAnakBidang, getTanah, updateTanah } from '@/modules/master-tanah/tanah.service';
import { getRiwayatKeduaTerbaru } from './riwayat.service';
import { Riwayat } from './riwayat.types';
import { formatPemilikSingkat } from '@/types/pemilik.types';

export interface GuardResult {
  perluKonfirmasi: boolean;
  pesan: string;
  /** Callback yang WAJIB dipanggil setelah user menekan "Ya, tetap lanjutkan" */
  onConfirmed?: () => Promise<void>;
}

/**
 * Sistem Peringatan Relasi Data (§11) — WAJIB dijalankan sebelum eksekusi
 * hapus/edit data kritikal di modul Transaksi. Skenario:
 *
 * 1. Hapus riwayat "Pecah Lahan" yang sudah punya bidang anak
 * 2. Hapus/edit bidang tanah induk yang masih punya bidang anak
 * 3. Hapus riwayat yang membuat pemilikSaatIni tidak sinkron (riwayat terbaru)
 * 4. Hapus riwayat "Penyatuan Lahan" yang sudah menghasilkan bidang gabungan
 * 5. Edit bidang sumber yang sudah "sudah-digabung" ke bidang lain
 *
 * Semua fungsi mengembalikan GuardResult. Jika perluKonfirmasi = true,
 * UI WAJIB menampilkan ConfirmDialog.tsx sebelum melanjutkan aksi.
 */

/** Skenario 1: cek apakah riwayat "pecah-lahan" ini adalah asal-usul bidang anak */
export async function cekHapusRiwayatPecahLahan(riwayat: Riwayat): Promise<GuardResult> {
  if (riwayat.jenisPeristiwa !== 'pecah-lahan') {
    return { perluKonfirmasi: false, pesan: '' };
  }

  // Cari bidang /tanah yang lahir dari riwayat ini — asumsi konvensi: bidang anak
  // menyimpan referensi sourceRiwayatId saat dibuat dari transaksi pecah lahan.
  const q = query(collection(db, 'tanah'), where('sourceRiwayatId', '==', riwayat.id));
  const snap = await getDocs(q);
  const jumlahAnak = snap.size;

  if (jumlahAnak === 0) {
    return { perluKonfirmasi: false, pesan: '' };
  }

  return {
    perluKonfirmasi: true,
    pesan: `⚠️ Riwayat ini adalah asal-usul pemecahan untuk ${jumlahAnak} bidang tanah anak. Menghapusnya tidak akan menghapus bidang anak, tapi jejak asal-usul pemecahannya akan hilang dari sistem. Lanjutkan hapus?`
  };
}

/** Skenario 4: cek apakah riwayat "penyatuan-lahan" ini sudah menghasilkan bidang gabungan */
export async function cekHapusRiwayatPenyatuanLahan(riwayat: Riwayat): Promise<GuardResult> {
  if (riwayat.jenisPeristiwa !== 'penyatuan-lahan' || !riwayat.tanahGabunganId) {
    return { perluKonfirmasi: false, pesan: '' };
  }

  const tanahGabungan = await getTanah(riwayat.tanahGabunganId);

  return {
    perluKonfirmasi: true,
    pesan: `⚠️ Riwayat ini adalah bagian dari jejak penyatuan lahan menjadi bidang "${
      tanahGabungan?.nomorSertifikat ?? riwayat.tanahGabunganId
    }". Menghapusnya TIDAK akan membatalkan penyatuan atau menghapus bidang gabungan, tapi jejak historisnya di bidang sumber ini akan hilang. Lanjutkan hapus?`
  };
}

/** Skenario 2: cek apakah bidang tanah ini adalah induk dari bidang lain (hasil pecah lahan) */
export async function cekHapusEditBidangInduk(tanahId: string): Promise<GuardResult> {
  const anakBidang = await getAnakBidang(tanahId);
  const jumlahAnak = anakBidang.length;

  if (jumlahAnak === 0) {
    return { perluKonfirmasi: false, pesan: '' };
  }

  return {
    perluKonfirmasi: true,
    pesan: `⚠️ Bidang tanah ini adalah induk dari ${jumlahAnak} bidang hasil pecahan. Menghapus/mengubah datanya bisa membuat data anak kehilangan rujukan induk yang benar. Lanjutkan?`
  };
}

/** Skenario 5: cek apakah bidang ini sudah menjadi sumber penyatuan (statusGabung = sudah-digabung) */
export async function cekEditBidangSudahDigabung(tanahId: string): Promise<GuardResult> {
  const tanah = await getTanah(tanahId);
  if (!tanah || tanah.statusGabung !== 'sudah-digabung') {
    return { perluKonfirmasi: false, pesan: '' };
  }

  const tanahGabungan = tanah.mergedIntoTanahId ? await getTanah(tanah.mergedIntoTanahId) : null;

  return {
    perluKonfirmasi: true,
    pesan: `⚠️ Bidang ini sudah ditandai "sudah digabung" menjadi bidang "${
      tanahGabungan?.nomorSertifikat ?? tanah.mergedIntoTanahId
    }". Bidang ini sebaiknya tidak diubah lagi karena berfungsi sebagai arsip riwayat. Lanjutkan mengubah?`
  };
}

/** Skenario 3: cek apakah riwayat yang dihapus adalah entri terbaru (memengaruhi pemilikSaatIni) */
export async function cekHapusRiwayatTerbaru(riwayat: Riwayat): Promise<GuardResult> {
  const keduaTerbaru = await getRiwayatKeduaTerbaru(riwayat.tanahId, riwayat.id);
  const tanah = await getTanah(riwayat.tanahId);

  // Jika ada riwayat lain yang tanggalnya lebih baru dari riwayat yang mau dihapus,
  // berarti riwayat ini BUKAN yang terbaru — tidak perlu peringatan skenario ini.
  const semuaRiwayatQ = query(
    collection(db, 'riwayat'),
    where('tanahId', '==', riwayat.tanahId)
  );
  const semuaSnap = await getDocs(semuaRiwayatQ);
  const semuaRiwayat = semuaSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Riwayat, 'id'>) }))
    .filter((r) => r.id !== riwayat.id);

  const adaYangLebihBaru = semuaRiwayat.some(
    (r) => new Date(r.tanggalKejadian) > new Date(riwayat.tanggalKejadian)
  );

  if (adaYangLebihBaru) {
    return { perluKonfirmasi: false, pesan: '' };
  }

  // Prioritas sumber pemilik pengganti: riwayat kedua-terbaru, lalu pemilikSebelumnya
  // yang tercatat di riwayat ini sendiri saat dibuat.
  const pemilikPengganti = keduaTerbaru?.pemilikBaru ?? riwayat.pemilikSebelumnya ?? null;
  const namaPemilikSebelumnya = pemilikPengganti
    ? formatPemilikSingkat(pemilikPengganti)
    : '(kosong / belum ada riwayat lain)';

  return {
    perluKonfirmasi: true,
    pesan: `⚠️ Riwayat ini adalah catatan terakhir untuk bidang tanah "${
      tanah?.nomorSertifikat ?? riwayat.tanahId
    }". Menghapusnya akan membuat "Pemilik Saat Ini" di Master Tanah otomatis kembali ke riwayat sebelumnya (${namaPemilikSebelumnya}). Lanjutkan?`,
    onConfirmed: async () => {
      if (pemilikPengganti) {
        await updateTanah(riwayat.tanahId, { pemilikSaatIni: pemilikPengganti });
      }
    }
  };
}

/**
 * Jalankan SEMUA guard yang relevan untuk aksi hapus riwayat.
 * Mengembalikan daftar peringatan yang harus ditampilkan berurutan (bisa lebih dari satu).
 */
export async function jalankanGuardHapusRiwayat(riwayat: Riwayat): Promise<GuardResult[]> {
  const hasil = await Promise.all([
    cekHapusRiwayatPecahLahan(riwayat),
    cekHapusRiwayatPenyatuanLahan(riwayat),
    cekHapusRiwayatTerbaru(riwayat)
  ]);
  return hasil.filter((r) => r.perluKonfirmasi);
}

/** Jalankan guard untuk aksi hapus/edit bidang tanah (Master Tanah) */
export async function jalankanGuardEditHapusTanah(tanahId: string): Promise<GuardResult[]> {
  const hasil = await Promise.all([
    cekHapusEditBidangInduk(tanahId),
    cekEditBidangSudahDigabung(tanahId)
  ]);
  return hasil.filter((r) => r.perluKonfirmasi);
}
