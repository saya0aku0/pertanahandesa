import { collection, getDocs, orderBy, query, where, limit } from 'firebase/firestore';
import { db } from '@/firebase/config';
import {
  createDoc,
  deleteDocById,
  getPaginated,
  getDocById,
  updateDocById
} from '@/firebase/firestore';
import {
  createTanah,
  getTanah,
  updateTanah,
  tandaiBidangSudahDigabung,
  tandaiBidangSudahDipecah
} from '@/modules/master-tanah/tanah.service';
import { TanahFormInput } from '@/modules/master-tanah/tanah.types';
import { Riwayat, RiwayatFormInput, PecahLahanBagian } from './riwayat.types';

const COLLECTION = 'riwayat';

export async function createRiwayat(input: RiwayatFormInput) {
  const id = await createDoc(COLLECTION, input);

  // Riwayat berstatus 'final' langsung menyinkronkan pemilikSaatIni di Master Tanah
  // (single source of truth). Riwayat 'draft' (Pending) TIDAK mengubah data master
  // dulu — menunggu difinalisasi setelah proses ukur/terbit sertifikat selesai.
  if (input.status === 'final') {
    await updateTanah(input.tanahId, { pemilikSaatIni: input.pemilikBaru });
  }

  return id;
}

export async function updateRiwayat(id: string, input: Partial<RiwayatFormInput>) {
  return updateDocById(COLLECTION, id, input);
}

export async function deleteRiwayat(id: string) {
  return deleteDocById(COLLECTION, id);
}

export async function getRiwayat(id: string) {
  return getDocById<Riwayat>(COLLECTION, id);
}

export async function getRiwayatByTanah(tanahId: string): Promise<Riwayat[]> {
  const q = query(
    collection(db, COLLECTION),
    where('tanahId', '==', tanahId),
    orderBy('tanggalKejadian', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Riwayat, 'id'>) }));
}

export async function getRiwayatPage(pageSize = 25, cursor?: unknown) {
  return getPaginated<Riwayat>(COLLECTION, [orderBy('tanggalKejadian', 'desc')], pageSize, cursor);
}

/** Ambil riwayat kedua-terbaru untuk suatu bidang (dipakai guard relasi §11.3) */
export async function getRiwayatKeduaTerbaru(tanahId: string, excludeId: string): Promise<Riwayat | null> {
  const q = query(
    collection(db, COLLECTION),
    where('tanahId', '==', tanahId),
    orderBy('tanggalKejadian', 'desc'),
    limit(5)
  );
  const snap = await getDocs(q);
  const docs = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Riwayat, 'id'>) }))
    .filter((r) => r.id !== excludeId);
  return docs[0] ?? null;
}

// ============================================================
// PECAH LAHAN (1 bidang -> banyak bagian, tiap bagian punya pemilik baru sendiri)
// Dipicu dari tombol "Perubahan Data" di Master Tanah ketika luas bidang TIDAK tetap
// (dijual sebagian atau ahli waris lebih dari satu). Setiap proses harus terhubung
// dan tersimpan record-nya: 1 riwayat induk -> N bidang tanah anak baru.
// ============================================================

export interface SimpanPecahLahanParams {
  tanahId: string;
  jenisPeristiwa: 'jual-beli' | 'waris' | 'pembaruan-data';
  tanggalKejadian: string;
  keterangan?: string;
  dokumenUrls: string[];
  pecahBagian: PecahLahanBagian[];
  status: 'draft' | 'final';
  /** Isi kalau ini kelanjutan (finalisasi) dari draft yang sudah pernah disimpan Pending */
  existingRiwayatId?: string;
}

/**
 * Simpan/perbarui riwayat Pecah Lahan.
 * - status 'draft' (Pending): hanya simpan/perbarui rincian bagian di /riwayat,
 *   BELUM membuat bidang tanah anak (karena nomor surat ukur/sertifikat baru
 *   biasanya belum terbit — masih antre proses pemerintah).
 * - status 'final' (Simpan): buat bidang tanah ANAK baru untuk tiap bagian,
 *   tautkan ke bidang induk (parentTanahId/sourceRiwayatId), lalu arsipkan
 *   bidang induk sebagai "sudah-dipecah" (data induk tetap ada, tidak dihapus).
 */
export async function simpanPecahLahan(params: SimpanPecahLahanParams): Promise<string> {
  const riwayatData = {
    tanahId: params.tanahId,
    jenisPeristiwa: 'pecah-lahan' as const,
    tanggalKejadian: params.tanggalKejadian,
    alasanPerubahan: params.jenisPeristiwa,
    pemilikBaru: params.pecahBagian[0]?.pemilikBaru ?? { nama: '', nik: '', alamatLengkap: '' },
    keterangan: params.keterangan ?? '',
    dokumenUrls: params.dokumenUrls,
    status: params.status,
    pecahBagian: params.pecahBagian
  };

  let riwayatId: string;
  if (params.existingRiwayatId) {
    await updateRiwayat(params.existingRiwayatId, riwayatData);
    riwayatId = params.existingRiwayatId;
  } else {
    riwayatId = await createDoc(COLLECTION, riwayatData);
  }

  if (params.status === 'draft') {
    // Pending — cukup simpan rincian, jangan buat bidang anak dulu.
    return riwayatId;
  }

  // Finalisasi: buat bidang anak untuk tiap bagian, dan catat balik id-nya ke riwayat.
  const tanahBaruIds: string[] = [];
  const bagianTerisi: PecahLahanBagian[] = [];
  const parentTanah = await getTanah(params.tanahId);
  for (const bagian of params.pecahBagian) {
    const id = await createTanah({
      nomorSertifikat: bagian.nomorSertifikatBaru,
      nomorSuratUkur: bagian.nomorSuratUkur,
      luas: bagian.luas,
      lokasi: parentTanah?.lokasi ?? '',
      pemilikSaatIni: bagian.pemilikBaru,
      status: 'aktif',
      parentTanahId: params.tanahId,
      sourceRiwayatId: riwayatId
    });
    tanahBaruIds.push(id);
    bagianTerisi.push({ ...bagian, tanahBaruId: id });
  }

  await updateRiwayat(riwayatId, { pecahBagian: bagianTerisi });
  await tandaiBidangSudahDipecah(params.tanahId, tanahBaruIds);

  return riwayatId;
}

/** Dipakai khusus untuk transaksi jenis "Pecah Lahan" model lama — buat bidang anak tunggal */
export async function createBidangAnakPecahLahan(
  parentTanahId: string,
  sourceRiwayatId: string,
  dataAnak: Omit<TanahFormInput, 'parentTanahId' | 'sourceRiwayatId'>
) {
  return createTanah({ ...dataAnak, parentTanahId, sourceRiwayatId });
}

// ============================================================
// PENYATUAN LAHAN (banyak bidang sumber -> 1 bidang gabungan)
// ============================================================

/**
 * Tahap 1: buat 1 entri riwayat 'penyatuan-lahan' di TIAP bidang sumber
 * (mencatat jejak historis di masing-masing bidang), tanpa menghapus data
 * bidang sumber apapun. Dipanggil dari PenyatuanLahanForm SEBELUM user
 * diarahkan ke form Master Tanah untuk mengisi data bidang gabungan baru.
 */
export async function buatRiwayatPenyatuanLahan(params: {
  sourceTanahIds: string[];
  tanggalKejadian: string;
  pemilikBaru: Riwayat['pemilikBaru'];
  keterangan?: string;
  dokumenUrls: string[];
}): Promise<string[]> {
  const riwayatIds: string[] = [];
  for (const tanahId of params.sourceTanahIds) {
    const id = await createDoc(COLLECTION, {
      tanahId,
      jenisPeristiwa: 'penyatuan-lahan',
      tanggalKejadian: params.tanggalKejadian,
      pemilikBaru: params.pemilikBaru,
      keterangan: params.keterangan ?? '',
      dokumenUrls: params.dokumenUrls,
      status: 'final'
    });
    riwayatIds.push(id);
  }
  return riwayatIds;
}

/**
 * Tahap 2: dipanggil SETELAH bidang gabungan baru berhasil dibuat di Master Tanah.
 * Menautkan balik setiap riwayat sumber ke bidang gabungan (tanahGabunganId),
 * lalu menandai setiap bidang sumber sebagai 'sudah-digabung' — data TETAP ADA,
 * cuma diarsipkan supaya silsilah pemilik bisa ditelusuri selamanya.
 */
export async function finalisasiPenyatuanLahan(
  tanahGabunganId: string,
  sourceTanahIds: string[],
  riwayatIds: string[]
) {
  await Promise.all(riwayatIds.map((id) => updateDocById(COLLECTION, id, { tanahGabunganId })));
  await Promise.all(sourceTanahIds.map((id) => tandaiBidangSudahDigabung(id, tanahGabunganId)));
}
