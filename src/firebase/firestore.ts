import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as fsLimit,
  startAfter,
  onSnapshot,
  QueryConstraint,
  DocumentData,
  Timestamp
} from 'firebase/firestore';
import { db } from './config';

// Helper generik Firestore — dipakai lintas modul supaya hemat kode & konsisten
// Semua fungsi di sini dirancang agar mudah dipagination / dibatasi untuk hemat read (§13)

export const col = (name: string) => collection(db, name);

export async function getDocById<T = DocumentData>(collectionName: string, id: string) {
  const snap = await getDoc(doc(db, collectionName, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as T) };
}

// Cari 1 dokumen berdasarkan field tertentu (mis. cari user berdasarkan "username")
// Dipakai untuk resolve username -> email saat login dua-cara (Email/Username)
export async function getDocByField<T = DocumentData>(
  collectionName: string,
  field: string,
  value: unknown
): Promise<(T & { id: string }) | null> {
  const q = query(col(collectionName), where(field, '==', value), fsLimit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as T) };
}

export async function getPaginated<T = DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[] = [],
  pageSize = 25,
  cursor?: unknown
) {
  const baseConstraints = [...constraints, fsLimit(pageSize)];
  if (cursor) baseConstraints.push(startAfter(cursor));
  const q = query(col(collectionName), ...baseConstraints);
  const snap = await getDocs(q);
  const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) }));
  const lastDoc = snap.docs[snap.docs.length - 1] ?? null;
  return { docs, lastDoc, hasMore: snap.docs.length === pageSize };
}

/**
 * Firestore MENOLAK field bernilai `undefined` (beda dengan `null`) — errornya persis
 * "Unsupported field value: undefined". Ini gampang kejadian di form-form kita karena
 * banyak field opsional (mis. lat/long dari Google Maps link yang belum diisi).
 * Helper ini membersihkan `undefined` (jadi field itu tidak ikut dikirim sama sekali)
 * di level utama DAN satu level di dalam object bersarang (mis. pemilikSaatIni.nik),
 * supaya createDoc/updateDocById aman dipakai apa adanya oleh semua form.
 */
function bersihkanUndefined<T>(data: T): T {
  if (Array.isArray(data) || data === null || typeof data !== 'object') return data;
  // Jangan "bongkar" object khusus seperti Firestore Timestamp — biarkan apa adanya.
  if (data instanceof Timestamp || data instanceof Date) return data;

  const hasil: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (value === undefined) continue;
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Timestamp) &&
      !(value instanceof Date)
    ) {
      hasil[key] = bersihkanUndefined(value);
    } else {
      hasil[key] = value;
    }
  }
  return hasil as T;
}

export async function createDoc<T extends object>(
  collectionName: string,
  data: T
) {
  const ref = await addDoc(col(collectionName), {
    ...bersihkanUndefined(data),
    createdAt: Timestamp.now()
  });
  return ref.id;
}

export async function updateDocById(
  collectionName: string,
  id: string,
  data: Partial<Record<string, unknown>>
) {
  await updateDoc(doc(db, collectionName, id), bersihkanUndefined(data));
}

export async function deleteDocById(collectionName: string, id: string) {
  await deleteDoc(doc(db, collectionName, id));
}

// Subscribe realtime — dipakai TERBATAS hanya untuk ringkasan dashboard (§13, hemat read)
export function subscribeCollection<T = DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[],
  callback: (docs: (T & { id: string })[]) => void
) {
  const q = query(col(collectionName), ...constraints);
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) })));
  });
}

export { where, orderBy, fsLimit as limit };
