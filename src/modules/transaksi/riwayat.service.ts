import { collection, getDocs, orderBy, query, where, limit } from 'firebase/firestore';
import { db } from '@/firebase/config';
import {
  createDoc,
  deleteDocById,
  getPaginated,
  updateDocById
} from '@/firebase/firestore';
import { createTanah, updateTanah } from '@/modules/master-tanah/tanah.service';
import { TanahFormInput } from '@/modules/master-tanah/tanah.types';
import { Riwayat, RiwayatFormInput } from './riwayat.types';

const COLLECTION = 'riwayat';

export async function createRiwayat(input: RiwayatFormInput) {
  const id = await createDoc(COLLECTION, input);

  // Jika jenis peristiwa adalah "pecah-lahan", otomatis buat entri baru di /tanah
  // dengan parentTanahId merujuk ke bidang induk (§10.3)
  // (Pemanggil bertanggung jawab memanggil createBidangAnakPecahLahan secara terpisah
  //  dengan data bidang anak yang lengkap, karena butuh input luas/lokasi baru dari user.)

  // Selalu update pemilikSaatIni di Master Tanah supaya tetap sinkron (single source of truth)
  await updateTanah(input.tanahId, { pemilikSaatIni: input.namaPemilikBaru });

  return id;
}

/** Dipakai khusus untuk transaksi jenis "Pecah Lahan" — buat bidang anak baru merujuk induk */
export async function createBidangAnakPecahLahan(
  parentTanahId: string,
  sourceRiwayatId: string,
  dataAnak: Omit<TanahFormInput, 'parentTanahId' | 'sourceRiwayatId'>
) {
  return createTanah({ ...dataAnak, parentTanahId, sourceRiwayatId });
}

export async function updateRiwayat(id: string, input: Partial<RiwayatFormInput>) {
  return updateDocById(COLLECTION, id, input);
}

export async function deleteRiwayat(id: string) {
  return deleteDocById(COLLECTION, id);
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
