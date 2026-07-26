import {
  createDoc,
  deleteDocById,
  getDocByField,
  getDocById,
  getPaginated,
  updateDocById,
  where
} from '@/firebase/firestore';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Tanah, TanahFormInput } from './tanah.types';
import { buatSlugSertifikat } from './slug';

const COLLECTION = 'tanah';

export async function createTanah(input: TanahFormInput) {
  const slug = buatSlugSertifikat(input.nomorSertifikat);
  return createDoc(COLLECTION, { ...input, slug });
}

export async function updateTanah(id: string, input: Partial<TanahFormInput>) {
  const patch: Partial<TanahFormInput> = { ...input };
  if (patch.nomorSertifikat) {
    patch.slug = buatSlugSertifikat(patch.nomorSertifikat);
  }
  return updateDocById(COLLECTION, id, patch);
}

/**
 * Ambil detail bidang tanah lewat SLUG (dari Nomor Sertifikat) — dipakai untuk
 * halaman "Lihat Detail Sertifikat" dengan link yang mudah dibaca (lihat slug.ts).
 */
export async function getTanahBySlug(slug: string) {
  return getDocByField<Tanah>(COLLECTION, 'slug', slug);
}

export async function deleteTanah(id: string) {
  return deleteDocById(COLLECTION, id);
}

export async function getTanah(id: string) {
  return getDocById<Tanah>(COLLECTION, id);
}

export async function getTanahPage(pageSize = 25, cursor?: unknown) {
  return getPaginated<Tanah>(COLLECTION, [], pageSize, cursor);
}

/** Cari bidang anak dari suatu bidang induk (dipakai untuk silsilah & guard relasi §11.2) */
export async function getAnakBidang(parentTanahId: string) {
  const result = await getPaginated<Tanah>(COLLECTION, [where('parentTanahId', '==', parentTanahId)], 100);
  return result.docs;
}

/**
 * Kebalikan dari getAnakBidang — cari bidang-bidang SUMBER yang menjadi asal
 * suatu bidang hasil PENYATUAN LAHAN (dipakai TanahSilsilah untuk telusuri ke bawah).
 */
export async function getBidangSumberGabungan(tanahId: string): Promise<Tanah[]> {
  const tanah = await getTanah(tanahId);
  if (!tanah?.parentTanahIds || tanah.parentTanahIds.length === 0) return [];
  const hasil = await Promise.all(tanah.parentTanahIds.map((id) => getTanah(id)));
  return hasil.filter((t): t is Tanah => t !== null);
}

/**
 * Tandai bidang sebagai "sudah digabung" ke bidang lain — TIDAK MENGHAPUS data apapun,
 * supaya penelusuran silsilah pemilik tetap ada selamanya (sesuai keputusan produk).
 */
export async function tandaiBidangSudahDigabung(tanahId: string, mergedIntoTanahId: string) {
  return updateTanah(tanahId, { statusGabung: 'sudah-digabung', mergedIntoTanahId });
}

/**
 * Tandai bidang induk sebagai "sudah dipecah" menjadi beberapa bidang anak —
 * TIDAK MENGHAPUS data induk, hanya diarsipkan supaya silsilah pemilik tetap
 * tertelusuri selamanya (simetris dengan tandaiBidangSudahDigabung).
 */
export async function tandaiBidangSudahDipecah(tanahId: string, pecahMenjadiTanahIds: string[]) {
  return updateTanah(tanahId, { statusPecah: 'sudah-dipecah', pecahMenjadiTanahIds });
}

/** Ubah status simpan bidang tanah: 'aktif' (final) atau 'draft' (Pending). */
export async function setStatusTanah(tanahId: string, status: 'aktif' | 'draft') {
  return updateTanah(tanahId, { status });
}

/**
 * Search bidang tanah untuk dropdown searchable di form Transaksi (§10.3).
 * Query berdasarkan nomorSertifikat (prefix match sederhana, hemat read dg limit).
 * Debounce ±400ms diterapkan di komponen pemanggil (useDebounce).
 * Bidang yang sudah 'sudah-digabung' tetap ikut muncul di hasil pencarian umum
 * (supaya tetap bisa ditelusuri), tapi disaring di tabel utama Master Tanah.
 */
export async function searchTanah(keyword: string, maxResults = 10): Promise<Tanah[]> {
  if (!keyword.trim()) return [];
  const kw = keyword.trim();
  const q = query(
    collection(db, COLLECTION),
    where('nomorSertifikat', '>=', kw),
    where('nomorSertifikat', '<=', kw + '\uf8ff'),
    limit(maxResults)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Tanah, 'id'>) }));
}
