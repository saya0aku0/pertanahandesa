import {
  createDoc,
  deleteDocById,
  getDocById,
  getPaginated,
  updateDocById,
  where
} from '@/firebase/firestore';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Tanah, TanahFormInput } from './tanah.types';

const COLLECTION = 'tanah';

export async function createTanah(input: TanahFormInput) {
  return createDoc(COLLECTION, input);
}

export async function updateTanah(id: string, input: Partial<TanahFormInput>) {
  return updateDocById(COLLECTION, id, input);
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
 * Search bidang tanah untuk dropdown searchable di form Transaksi (§10.3).
 * Query berdasarkan nomorSertifikat (prefix match sederhana, hemat read dg limit).
 * Debounce ±400ms diterapkan di komponen pemanggil (useDebounce).
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
